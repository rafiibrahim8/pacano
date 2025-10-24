import path from 'path';
import fs from 'fs';
import { Model } from 'sequelize';
import { sequelize } from '../models';
import { FileExistMap } from './utils';
import { MIRRORDIR, TEMP_DIRECTORY } from '../config';
import logger from '../logger';

const Repos = sequelize.models.Repos;
const Packages = sequelize.models.Packages;

const removeOldSingleRepo = async (repo: Model<any, any>): Promise<void> => {
    let repo_name = repo.get('name') as string;
    let _allRepoPkgs = await Packages.findAll({ where: { repo: repo_name } });
    let _allFilesDB = _allRepoPkgs.map(
        (value) => value.get('file_name') as string,
    );
    let allFilesDisk = await fs.promises.readdir(
        path.join(MIRRORDIR, repo_name),
    );
    let allFilesDB: FileExistMap = {};
    let toRemove: string[] = [];
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

    await Promise.all(
        toRemove.map((element) => {
            const localFilePath = path.join(MIRRORDIR, repo_name, element);
            return fs.promises.rm(localFilePath, { force: true });
        }),
    );
};

const removeOldPkgs = async (): Promise<void> => {
    let repos = await Repos.findAll();
    let promiseArray: Promise<void>[] = [];
    repos.forEach((value) => {
        promiseArray.push(removeOldSingleRepo(value));
    });
    await Promise.allSettled(promiseArray).then((values) => {
        //let fulfilled = values.filter((value) => value.status === 'fulfilled') as PromiseFulfilledResult<void>[];
        let rejected = values.filter(
            (value) => value.status === 'rejected',
        ) as PromiseRejectedResult[];
        if (rejected.length !== 0) {
            logger.error('Failed to remove some old packages');
        }
    });
    await fs.promises.rm(TEMP_DIRECTORY, { recursive: true, force: true });
};

export default removeOldPkgs;
