import path from 'path';
import fs from 'fs';
import { Model } from 'sequelize';
import { MIRRORDIR } from '../config';
import logger from '../logger';
import { PackageModel } from '../models/packageModel';
import { RepoModel } from '../models/repoModel';
import { FileExistMap } from '../types';

const removeOldSingleRepo = async (repo: Model<any, any>): Promise<void> => {
  const repo_name = repo.get('name') as string;
  const _allRepoPkgs = await PackageModel.findAll({ where: { repo: repo_name } });
  const _allFilesDB = _allRepoPkgs.map(
    (value) => value.get('file_name') as string,
  );
  let allFilesDisk = fs.readdirSync(path.join(MIRRORDIR, repo_name));
  const allFilesDB: FileExistMap = {};
  const toRemove: string[] = [];
  _allFilesDB.forEach((element) => (allFilesDB[element] = true));
  allFilesDisk = allFilesDisk.filter(
    (value) => !(value.endsWith('.db') || value.endsWith('.files')),
  );

  allFilesDisk.forEach((element) => {
    if (element.endsWith('.sig')) {
      if (!allFilesDB[element.slice(0, -4)]) {
        toRemove.push(element);
      }
    } else if (!allFilesDB[element]) {
      toRemove.push(element);
    }
  });

  toRemove.forEach((element) => {
    const loaclFilePath = path.join(MIRRORDIR, repo_name, element);
    fs.rmSync(loaclFilePath);
  });
};

const removeOldPkgs = async (): Promise<void> => {
  const repos = await RepoModel.findAll();
  const promiseArray: Promise<void>[] = [];
  repos.forEach((value) => {
    promiseArray.push(removeOldSingleRepo(value));
  });
  return Promise.allSettled(promiseArray).then((values) => {
    //let fulfilled = values.filter((value) => value.status === 'fulfilled') as PromiseFulfilledResult<void>[];
    const rejected = values.filter(
      (value) => value.status === 'rejected',
    ) as PromiseRejectedResult[];
    if (rejected.length !== 0) {
      logger.error('Failed to remove some old packages');
    }
  });
};

export default removeOldPkgs;
