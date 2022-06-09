import path from "path";
import parseDB from "./parseDB";
import { Model } from "sequelize";
import { sequelize } from "../models";
import { getMirrors, downloadFile, getEtagAndLastModified, EtagLastMod } from "./utils";
import { MIRRORDIR } from "../config";
import logger from "../logger";
import fs from "fs";

const Repos = sequelize.models.Repos;
const Packages = sequelize.models.Packages;

const syncLocalDBSingle = async (repo_name: string): Promise<void> => {
    let repoDbPath = path.join(MIRRORDIR, repo_name, `${repo_name}.db`);
    let _allRepoPkgs = await Packages.findAll({ where: { repo: repo_name } });
    let allRepoPkgs = _allRepoPkgs.map(value => {
        return {
            name: value.get('name') as string,
            repo: value.get('repo') as string,
            file_name: value.get('file_name') as string,
            version: value.get('version') as string,
            times_updated: value.get('times_updated') as number
        }
    });
    return parseDB(repoDbPath).then(parsedDB => {
        let toBeUpdated: any = [];
        allRepoPkgs.forEach(element => {
            if (!parsedDB[element.name]) {
                logger.warn(`Can not find package ${element.name} on repo ${repo_name}`);
                return;
            }
            if (element.file_name !== parsedDB[element.name].file_name) {
                toBeUpdated.push({
                    name: element.name,
                    repo: element.repo,
                    file_name: parsedDB[element.name].file_name,
                    version: parsedDB[element.name].version,
                    times_updated: element.times_updated + 1
                });
            }
        });
        return Packages.bulkCreate(toBeUpdated, {
            updateOnDuplicate: ['file_name', 'version', 'times_updated'], validate: true
        }).then();
    });
}

const syncSingle = async (repo: Model<any, any>): Promise<void> => {
    let use_mirror = repo.get('use_mirror') as string;
    let repo_name = repo.get('name') as string;
    let etag = repo.get('etag') as string;
    let last_modified = repo.get('last_modified') as string;
    let urls = getMirrors(use_mirror, repo_name, 'db');
    let etag_lastmod: EtagLastMod;
    let repoLocalDir = path.join(MIRRORDIR, repo_name);
    let localDBPath = path.join(MIRRORDIR, repo_name, `${repo_name}.db`);
    let localFilesFilePath = path.join(MIRRORDIR, repo_name, `${repo_name}.files`);

    if (!fs.existsSync(repoLocalDir)) {
        fs.mkdirSync(repoLocalDir, { recursive: true });
    }

    for (let url of urls) {
        try {
            url = `${url}/${repo_name}.db`;
            etag_lastmod = await getEtagAndLastModified(url);
            if (fs.existsSync(localDBPath) && fs.existsSync(localFilesFilePath) && ((etag && etag === etag_lastmod.etag) || (last_modified && last_modified === etag_lastmod.last_modified))) {
                await syncLocalDBSingle(repo_name);
                return;
            }
            break;
        } catch { };
    }

    for (let url of urls) {
        try {
            let db_file_url = `${url}/${repo_name}.db`;
            let files_file_url = `${url}/${repo_name}.files`;
            await downloadFile(db_file_url, localDBPath);
            await downloadFile(files_file_url, localFilesFilePath);
            etag_lastmod = await getEtagAndLastModified(db_file_url);
            logger.verbose(`DB download finished...${repo_name}`);
            await Repos.update(etag_lastmod, { where: { name: repo_name } });
            await syncLocalDBSingle(repo_name);
            logger.verbose(`DB sync finished...${repo_name}`);
            break;
        } catch (err) { }
    }
}

const syncDB = async (): Promise<void> => {
    let repos = await Repos.findAll();
    for (let repo of repos) {
        try {
            await syncSingle(repo);
        } catch (err) {
            logger.error(`Failed to sync ${repo}. Reason: ${err}`);
        }
    }
};

export default syncDB;
