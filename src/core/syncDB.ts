import path from 'path';
import axios from 'axios';
import parseDB from './parseDB';
import { downloadFile } from './downloader';
import {
  getMirrors,
  getEtagAndLastModified,
  getValue,
  setValue,
} from './utils';
import {
  MIRRORDIR,
  FILES_FILE_SYNC_INTERVAL,
  REMOVE_IF_PACKAGE_NOT_FOUND,
} from '../config';
import logger from '../logger';
import fs from 'fs';
import { RepoModel } from '../models/repoModel';
import {
  PackageChange,
  Repo,
  PackageChangeType,
  Package,
  PacmanDB,
  PacmanPackage,
  RemotePackage,
} from '../types';
import { PackageModel } from '../models/packageModel';

const checkIfNeedsUpdate = async (
  localPackage: Package,
  pacmanPackage: PacmanPackage,
): Promise<[boolean, number]> => {
  if (localPackage.fileName !== pacmanPackage.fileName) {
    return [true, 1];
  }
  if (!localPackage.sha256sum && pacmanPackage.sha256sum) {
    return [true, 0];
  }
  return [false, 0];
};

const checkIfFound = async (
  pkg: RemotePackage,
): Promise<[boolean, boolean]> => {
  if (!pkg) {
    return [false, false];
  }
  return RepoModel.findOne({ where: { name: pkg.repo } }).then((repo) => {
    if (!repo) {
      return [true, false];
    }
    return [true, true];
  });
};

const resolveRepoChange = async (
  localPackage: Package,
): Promise<PackageChange | null> => {
  const res = await axios.get(
    `https://archlinux.org/packages/search/json/?name=${localPackage.name}`,
  );
  const pkg = res.data.results[0] as RemotePackage;
  const [found, isRepoTracking] = await checkIfFound(pkg);
  if (found && isRepoTracking) {
    logger.info(
      `Package ${localPackage.name} is now in repo ${pkg.repo}. Updating...`,
    );
    return {
      type: PackageChangeType.UPDATE,
      data: {
        name: localPackage.name,
        repo: pkg.repo,
        fileName: pkg.filename,
        downloadSize: pkg.compressed_size,
        installSize: pkg.installed_size,
        version: pkg.pkgver,
        timesUpdated: localPackage.timesUpdated + 1,
      },
    };
  } else if (found && REMOVE_IF_PACKAGE_NOT_FOUND) {
    logger.warn(
      `Package ${localPackage.name} is now in repo ${pkg.repo}, but it is not tracked by pacano. Removing...`,
    );
    return {
      type: PackageChangeType.DELETE,
      data: { name: localPackage.name },
    };
  } else if (!found && REMOVE_IF_PACKAGE_NOT_FOUND) {
    logger.warn(
      `Package ${localPackage.name} is not found on any repo. Removing...`,
    );
    return {
      type: PackageChangeType.DELETE,
      data: { name: localPackage.name },
    };
  } else if (found) {
    logger.warn(
      `Package ${localPackage.name} is now in repo ${pkg.repo}, but it is not tracked by pacano. Skipping...`,
    );
    return null;
  } else {
    logger.warn(
      `Package ${localPackage.name} is not found on any repo. Skipping...`,
    );
    return null;
  }
};

const checkSinglePakage = async (
  repoName: string,
  localPackage: Package,
  parsedPacmanDB: PacmanDB,
): Promise<PackageChange | null> => {
  if (!parsedPacmanDB[localPackage.name]) {
    logger.warn(
      `Can not find package ${localPackage.name} on repo ${repoName}. Trying to check if it is in a new repo...`,
    );
    const newDetails = await resolveRepoChange(localPackage);
    return newDetails;
  }
  const [NeedsUpdate, count] = await checkIfNeedsUpdate(
    localPackage,
    parsedPacmanDB[localPackage.name],
  );
  if (NeedsUpdate) {
    const pacmanPackage = parsedPacmanDB[localPackage.name];
    return {
      type: PackageChangeType.UPDATE,
      data: {
        name: localPackage.name,
        repo: localPackage.repo,
        fileName: pacmanPackage.fileName,
        downloadSize: pacmanPackage.downloadSize,
        installSize: pacmanPackage.installSize,
        version: pacmanPackage.version,
        md5sum: parsedPacmanDB[localPackage.name].md5sum,
        sha256sum: parsedPacmanDB[localPackage.name].sha256sum,
        timesUpdated: localPackage.timesUpdated + count,
      },
    };
  }
  return null;
};

const syncLocalDBSingle = async (repoName: string): Promise<void> => {
  const localDBPackages = await PackageModel.findAll({
    where: { repo: repoName },
  });

  const repoDBPath = path.join(MIRRORDIR, repoName, `${repoName}.db`);
  const parsedPacmanDB = await parseDB(repoDBPath);
  const resultPromises: Promise<PackageChange | null>[] = [];
  localDBPackages.forEach((element) => {
    resultPromises.push(checkSinglePakage(repoName, element, parsedPacmanDB));
  });
  const results = await Promise.all(resultPromises);
  const toDelete = results
    .filter((value) => value?.type === PackageChangeType.DELETE)
    .map((value) => value?.data.name) as string[];
  const toUpdate = results
    .filter((value) => value?.type === PackageChangeType.UPDATE)
    .map((value) => value?.data) as Package[];

  const modifyPromises: Promise<unknown>[] = [
    PackageModel.destroy({ where: { name: toDelete } }),
    PackageModel.bulkCreate(toUpdate, {
      updateOnDuplicate: [
        'repo',
        'fileName',
        'version',
        'timesUpdated',
        'downloadSize',
        'installSize',
        'md5sum',
        'sha256sum',
      ],
      validate: true,
    }),
  ];
  await Promise.all(modifyPromises);
};

const syncSingle = async (repo: Repo): Promise<void> => {
  const urls = getMirrors(repo.useMirror, repo.name, 'db');
  let etag, lastModified;
  const repoLocalDir = path.join(MIRRORDIR, repo.name);
  const localDBPath = path.join(MIRRORDIR, repo.name, `${repo.name}.db`);
  const localFilesFilePath = path.join(
    MIRRORDIR,
    repo.name,
    `${repo.name}.files`,
  );

  if (!fs.existsSync(repoLocalDir)) {
    fs.mkdirSync(repoLocalDir, { recursive: true });
  }

  for (let url of urls) {
    try {
      url = `${url}/${repo.name}.db`;
      [etag, lastModified] = await getEtagAndLastModified(url);
      if (
        fs.existsSync(localDBPath) &&
        fs.existsSync(localFilesFilePath) &&
        ((repo.etag && repo.etag === etag) ||
          (repo.lastModified && repo.lastModified === lastModified))
      ) {
        logger.verbose(
          `DB is up to date for ${repo.name}. Syncing without downloading...`,
        );
        await syncLocalDBSingle(repo.name);
        logger.verbose(`DB sync finished...${repo.name}`);
        return;
      }
      break;
    } catch {
      // eslint-disable-next-line no-console
    }
  }

  for (const url of urls) {
    try {
      const db_file_url = `${url}/${repo.name}.db`;
      const files_file_url = `${url}/${repo.name}.files`;
      await downloadFile(db_file_url, localDBPath);
      if (
        FILES_FILE_SYNC_INTERVAL > -1 &&
        Date.now() - (await getValue(`last_files_file_sync_${repo.name}`, 0)) >
          1000 * FILES_FILE_SYNC_INTERVAL
      ) {
        logger.verbose(`Downloading files file for ${repo.name}...`);
        await downloadFile(files_file_url, localFilesFilePath);
        await setValue(`last_files_file_sync_${repo.name}`, Date.now());
      } else {
        logger.verbose(`Files file skipped for ${repo.name}...`);
      }
      [etag, lastModified] = await getEtagAndLastModified(db_file_url);
      logger.verbose(`DB download finished...${repo.name}`);
      await RepoModel.update(
        { etag, lastModified },
        { where: { name: repo.name } },
      );
      await syncLocalDBSingle(repo.name);
      logger.verbose(`DB sync finished...${repo.name}`);
      break;
    } catch (err) {
      // eslint-disable-next-line no-console
    }
  }
};

const syncDB = async (): Promise<void> => {
  const repos = await RepoModel.findAll();
  for (const repo of repos) {
    try {
      await syncSingle(repo);
    } catch (err) {
      logger.error(`Failed to sync ${repo}. Reason: ${err}`);
    }
  }
};

export default syncDB;
