import path from "path";
import fs from "fs";
import { Model } from "sequelize";
import { sequelize } from "../models";
import { getMirrors, downloadFile, FileExistMap } from "./utils";
import { MIRRORDIR } from "../config";
import logger from "../logger";

const Repos = sequelize.models.Repos;
const Packages = sequelize.models.Packages;

const downloadSinglePackage = async (repo_name: string, use_mirror:string, file_name: string): Promise<boolean> => {
    let urls = getMirrors(use_mirror, repo_name, 'package');
    for (let url of urls) {
        url = `${url}/${file_name}`;
        let loaclFilePath = path.join(MIRRORDIR, repo_name, file_name);
        try {
            await downloadFile(url, loaclFilePath);
            await downloadFile(`${url}.sig`, `${loaclFilePath}.sig`);
            return true;
        } catch { };
    }
    return false;
}

const downloadSingleRepo = async (repo: Model<any, any>): Promise<void> => {
    let use_mirror = repo.get('use_mirror') as string;
    let repo_name = repo.get('name') as string;
    let _allRepoPkgs = await Packages.findAll({ where: { repo: repo_name } });
    let allFilesDB = _allRepoPkgs.map(value => value.get('file_name') as string);
    let _allFilesDisk = fs.readdirSync(path.join(MIRRORDIR, repo_name));
    let allFilesDisk: FileExistMap = {};
    _allFilesDisk.forEach(element => allFilesDisk[element] = true);
    for (let i of allFilesDB) {
        if (allFilesDisk[i]) {
            continue;
        }
        if (! await downloadSinglePackage(repo_name, use_mirror, i)) {
            logger.error(`Can not download file ${i} of repo ${repo_name}`);
        }
    }
}

const downloadPkgs = async (): Promise<void> => {
    let repos = await Repos.findAll();
    let promiseArray: Promise<void>[] = [];
    repos.forEach(value => {
        promiseArray.push(downloadSingleRepo(value));
    });
    return Promise.allSettled(promiseArray).then(values => {
        //let fulfilled = values.filter((value) => value.status === 'fulfilled') as PromiseFulfilledResult<void>[];
        let rejected = values.filter((value) => value.status === 'rejected') as PromiseRejectedResult[];
        if (rejected.length !== 0) {
            logger.error('Failed to sync some DB');
        };
    });
};

export default downloadPkgs;
