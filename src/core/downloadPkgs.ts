import path from 'path';
import fs from 'fs';
import { Model } from 'sequelize';
import { sequelize } from '../models';
import { downloadFile, Checksums } from './downloader';
import { getMirrors, FileExistMap } from './utils';
import { MIRRORDIR } from '../config';
import logger from '../logger';

const Repos = sequelize.models.Repos;
const Packages = sequelize.models.Packages;

const downloadSinglePackage = async (
    repo_name: string,
    use_mirror: string,
    file_name: string,
    download_size: number,
    checksums: Checksums = undefined,
): Promise<boolean> => {
    let urls = getMirrors(use_mirror, repo_name, 'package');
    for (let url of urls) {
        url = `${url}/${file_name}`;
        let loaclFilePath = path.join(MIRRORDIR, repo_name, file_name);
        try {
            await downloadFile(`${url}.sig`, `${loaclFilePath}.sig`); // Download `.sig` frist. Reson: issue #1
            await downloadFile(url, loaclFilePath, download_size, checksums);
            return true;
        } catch {}
    }
    return false;
};

const downloadSingleRepo = async (repo: Model<any, any>): Promise<void> => {
    let use_mirror = repo.get('use_mirror') as string;
    let repo_name = repo.get('name') as string;
    let _allRepoPkgs = await Packages.findAll({ where: { repo: repo_name } });
    let allFilesDB = _allRepoPkgs.map((value) => {
        return {
            file_name: value.get('file_name') as string,
            download_size: value.get('download_size') as number,
            md5sum: value.get('md5sum') as string | undefined,
            sha256sum: value.get('sha256sum') as string | undefined,
        };
    });
    let _allFilesDisk = fs.readdirSync(path.join(MIRRORDIR, repo_name));
    let allFilesDisk: FileExistMap = {};
    _allFilesDisk.forEach((element) => (allFilesDisk[element] = true));
    for (let i of allFilesDB) {
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
            logger.warn(
                `Can not download file ${i.file_name} of repo ${repo_name}`,
            );
        }
    }
};

const downloadPkgs = async (): Promise<void> => {
    let repos = await Repos.findAll();
    for (let repo of repos) {
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
