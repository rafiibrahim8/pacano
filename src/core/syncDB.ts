import path from 'node:path';
import parseDB, { PacmanDB } from './parseDB';
import { Packages, Repos, Repo } from '../models';
import { downloadFile } from './downloader';
import {
    fetchOk,
    getMirrors,
    getEtagAndLastModified,
    EtagLastMod,
    getValue,
    setValue,
} from './utils';
import {
    MIRRORDIR,
    FILES_FILE_SYNC_INTERVAL,
    REMOVE_IF_PACKAGE_NOT_FOUND,
} from '../config';
import logger from '../logger';
import fs from 'node:fs';
import { isExistPath } from '../utils';

enum PackageStatus {
    UPDATE = 'update',
    DELETE = 'delete',
}

const checkIfNeedsUpdate = async (
    localDBElement: any,
    parsedDBElement: any,
): Promise<[boolean, number]> => {
    if (localDBElement.file_name !== parsedDBElement.file_name) {
        return [true, 1];
    }
    if (!localDBElement.sha256sum && parsedDBElement.sha256sum) {
        return [true, 0];
    }
    if (
        localDBElement.sha256sum &&
        parsedDBElement.sha256sum &&
        localDBElement.sha256sum !== parsedDBElement.sha256sum
    ) {
        return [true, 0];
    }
    return [false, 0];
};

const checkIfFound = async (pkg: any): Promise<[boolean, boolean]> => {
    if (!pkg) {
        return [false, false];
    }
    if (!Repos.findOne(pkg.repo)) {
        return [true, false];
    }
    return [true, true];
};

const resolveRepoChange = async (
    pkg_name: string,
    times_updated: number,
): Promise<any> => {
    return fetchOk(`https://archlinux.org/packages/search/json/?name=${pkg_name}`)
        .then((response) => response.json())
        .then((data: any) => {
            let pkg = data.results[0];
            return checkIfFound(pkg).then(([found, isRepoTracking]) => {
                if (found && isRepoTracking) {
                    logger.info(
                        `Package ${pkg_name} is now in repo ${pkg.repo}. Updating...`,
                    );
                    return {
                        type: PackageStatus.UPDATE,
                        data: {
                            name: pkg_name,
                            repo: pkg.repo,
                            file_name: pkg.filename,
                            download_size: pkg.compressed_size,
                            install_size: pkg.installed_size,
                            version: pkg.pkgver,
                            times_updated: times_updated + 1,
                        },
                    };
                } else if (found && REMOVE_IF_PACKAGE_NOT_FOUND) {
                    logger.warn(
                        `Package ${pkg_name} is now in repo ${pkg.repo}, but it is not tracked by pacano. Removing...`,
                    );
                    return {
                        type: PackageStatus.DELETE,
                        data: { name: pkg_name },
                    };
                } else if (!found && REMOVE_IF_PACKAGE_NOT_FOUND) {
                    logger.warn(
                        `Package ${pkg_name} is not found on any repo. Removing...`,
                    );
                    return {
                        type: PackageStatus.DELETE,
                        data: { name: pkg_name },
                    };
                } else if (found) {
                    logger.warn(
                        `Package ${pkg_name} is now in repo ${pkg.repo}, but it is not tracked by pacano. Skipping...`,
                    );
                    return null;
                } else {
                    logger.warn(
                        `Package ${pkg_name} is not found on any repo. Skipping...`,
                    );
                    return null;
                }
            });
        })
        .catch((err) => {
            logger.error(
                `Failed to resolve repo change for package ${pkg_name}: ${err}`,
            );
            return null;
        });
};

const checkSinglePakage = async (
    repoName: string,
    localDBElement: any,
    parsedDB: PacmanDB,
): Promise<any> => {
    if (!parsedDB[localDBElement.name]) {
        logger.warn(
            `Can not find package ${localDBElement.name} on repo ${repoName}. Trying to check if it is in a new repo...`,
        );
        let newDetails = await resolveRepoChange(
            localDBElement.name,
            localDBElement.times_updated,
        );
        return newDetails;
    }
    const [NeedsUpdate, count] = await checkIfNeedsUpdate(
        localDBElement,
        parsedDB[localDBElement.name],
    );
    if (NeedsUpdate) {
        return {
            type: PackageStatus.UPDATE,
            data: {
                name: localDBElement.name,
                repo: localDBElement.repo,
                file_name: parsedDB[localDBElement.name].file_name,
                download_size: parsedDB[localDBElement.name].download_size,
                install_size: parsedDB[localDBElement.name].install_size,
                version: parsedDB[localDBElement.name].version,
                md5sum: parsedDB[localDBElement.name].md5sum,
                sha256sum: parsedDB[localDBElement.name].sha256sum,
                times_updated: localDBElement.times_updated + count,
            },
        };
    }
    return null;
};

const syncLocalDBSingle = async (repo_name: string): Promise<void> => {
    let repoDbPath = path.join(MIRRORDIR, repo_name, `${repo_name}.db`);
    let allRepoPkgs = Packages.findAllByRepo(repo_name);
    return parseDB(repoDbPath).then((parsedDB) => {
        let resultPromises: Promise<any>[] = [];
        allRepoPkgs.forEach((element) => {
            let resultPromise = checkSinglePakage(repo_name, element, parsedDB);
            resultPromises.push(resultPromise);
        });
        return Promise.all(resultPromises)
            .then((results) => {
                return results.filter((value) => value !== null);
            })
            .then((results) => {
                const toDelete = results
                    .filter((value) => value.type === PackageStatus.DELETE)
                    .map((value) => value.data.name);
                const toUpdate = results
                    .filter((value) => value.type === PackageStatus.UPDATE)
                    .map((value) => value.data);

                Packages.destroy(toDelete);
                Packages.bulkCreate(toUpdate, [
                    'repo',
                    'file_name',
                    'version',
                    'times_updated',
                    'download_size',
                    'install_size',
                    'md5sum',
                    'sha256sum',
                ]);
            })
            .catch((err) => {
                logger.error(
                    `An unexpected error occurred while syncing local DB for repo ${repo_name}: ${err}`,
                );
            })
            .then();
    });
};

const syncSingle = async (repo: Repo): Promise<void> => {
    let use_mirror = repo.use_mirror;
    let repo_name = repo.name;
    let etag = repo.etag;
    let last_modified = repo.last_modified;
    let urls = await getMirrors(use_mirror, repo_name, 'db');
    let etag_lastmod: EtagLastMod;
    let repoLocalDir = path.join(MIRRORDIR, repo_name);
    let localDBPath = path.join(MIRRORDIR, repo_name, `${repo_name}.db`);
    let localFilesFilePath = path.join(
        MIRRORDIR,
        repo_name,
        `${repo_name}.files`,
    );

    await fs.promises.mkdir(repoLocalDir, { recursive: true });

    for (let url of urls) {
        try {
            url = `${url}/${repo_name}.db`;
            etag_lastmod = await getEtagAndLastModified(url);
            if (
                (await isExistPath(localDBPath)) &&
                (await isExistPath(localFilesFilePath)) &&
                ((etag && etag === etag_lastmod.etag) ||
                    (last_modified &&
                        last_modified === etag_lastmod.last_modified))
            ) {
                logger.verbose(
                    `DB is up to date for ${repo_name}. Syncing without downloading...`,
                );
                await syncLocalDBSingle(repo_name);
                logger.verbose(`DB sync finished...${repo_name}`);
                return;
            }
            break;
        } catch {}
    }

    for (let url of urls) {
        try {
            let db_file_url = `${url}/${repo_name}.db`;
            let files_file_url = `${url}/${repo_name}.files`;
            await downloadFile(db_file_url, localDBPath);
            if (
                FILES_FILE_SYNC_INTERVAL > -1 &&
                Date.now() -
                    (await getValue(`last_files_file_sync_${repo_name}`, 0)) >
                    1000 * FILES_FILE_SYNC_INTERVAL
            ) {
                logger.verbose(`Downloading files file for ${repo_name}...`);
                await downloadFile(files_file_url, localFilesFilePath);
                await setValue(`last_files_file_sync_${repo_name}`, Date.now());
            } else {
                logger.verbose(`Files file skipped for ${repo_name}...`);
            }
            etag_lastmod = await getEtagAndLastModified(db_file_url);
            logger.verbose(`DB download finished...${repo_name}`);
            Repos.update(repo_name, etag_lastmod);
            await syncLocalDBSingle(repo_name);
            logger.verbose(`DB sync finished...${repo_name}`);
            break;
        } catch (err) {}
    }
};

const syncDB = async (): Promise<void> => {
    let repos = Repos.findAll();
    for (let repo of repos) {
        try {
            await syncSingle(repo);
        } catch (err) {
            logger.error(`Failed to sync ${repo.name}. Reason: ${err}`);
        }
    }
};

export default syncDB;
