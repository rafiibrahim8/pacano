import path from 'path';
import fs from 'fs';
import { Model } from 'sequelize';
import { downloadFile, Checksums } from './downloader';
import { getMirrors } from './utils';
import { MIRRORDIR } from '../config';
import logger from '../logger';
import { PackageModel } from '../models/packageModel';
import { RepoModel } from '../models/repoModel';
import { FileExistMap } from '../types';

const downloadSinglePackage = async (
  repo_name: string,
  use_mirror: string,
  file_name: string,
  download_size: number,
  checksums: Checksums = undefined,
): Promise<boolean> => {
  const urls = getMirrors(use_mirror, repo_name, 'package');
  for (let url of urls) {
    url = `${url}/${file_name}`;
    const loaclFilePath = path.join(MIRRORDIR, repo_name, file_name);
    try {
      await downloadFile(`${url}.sig`, `${loaclFilePath}.sig`); // Download `.sig` frist. Reson: issue #1
      await downloadFile(url, loaclFilePath, download_size, checksums);
      return true;
    } catch {}
  }
  return false;
};

const downloadSingleRepo = async (repo: Model<any, any>): Promise<void> => {
  const use_mirror = repo.get('use_mirror') as string;
  const repo_name = repo.get('name') as string;
  const _allRepoPkgs = await PackageModel.findAll({ where: { repo: repo_name } });
  const allFilesDB = _allRepoPkgs.map((value) => {
    return {
      file_name: value.get('file_name') as string,
      download_size: value.get('download_size') as number,
      md5sum: value.get('md5sum') as string | undefined,
      sha256sum: value.get('sha256sum') as string | undefined,
    };
  });
  const _allFilesDisk = fs.readdirSync(path.join(MIRRORDIR, repo_name));
  const allFilesDisk: FileExistMap = {};
  _allFilesDisk.forEach((element) => (allFilesDisk[element] = true));
  for (const i of allFilesDB) {
    if (allFilesDisk[i.file_name]) {
      continue;
    }
    if (
      !(await downloadSinglePackage(
        repo_name,
        use_mirror,
        i.file_name,
        i.download_size,
        { md5sum: i.md5sum, sha256sum: i.sha256sum },
      ))
    ) {
      logger.warn(`Can not download file ${i.file_name} of repo ${repo_name}`);
    }
  }
};

const downloadPkgs = async (): Promise<void> => {
  const repos = await RepoModel.findAll();
  for (const repo of repos) {
    try {
      await downloadSingleRepo(repo);
    } catch (err) {
      logger.error(
        `Failed to download file from repo: ${repo}. Reason: ${err}`,
      );
    }
  }
};

export default downloadPkgs;
