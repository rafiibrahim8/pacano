import path from "path";
import axios from "axios";
import parseDB, { PacmanDB } from "./parseDB";
import { Model } from "sequelize";
import { sequelize } from "../models";
import { downloadFile } from "./downloader";
import { getMirrors, getEtagAndLastModified, EtagLastMod, getValue, setValue } from "./utils";
import { MIRRORDIR, FILES_FILE_SYNC_INTERVAL } from "../config";
import logger from "../logger";
import fs from "fs";

const Repos = sequelize.models.Repos;
const Packages = sequelize.models.Packages;

const resolveRepoChange = async (pkg_name: string): Promise<string | null> => {
    return axios.get(`https://archlinux.org/packages/search/json/?name=${pkg_name}`).then(response => {
        let pkg = response.data.results[0];
        if (pkg) {
            let repo = pkg.repo;
            logger.info(`Package ${pkg_name} is now in repo ${repo}.`);
            return repo;
        } else {
            logger.warn(`Can not find package ${pkg_name} on archlinux.org. It may be deleted.`);
            return null;
        }
    }).catch(err => {
        logger.error(`Failed to resolve repo change for package ${pkg_name}: ${err}`);
        return null;
    });
};

const checkSinglePakage = async (repoName:string, localDBElement:any, parsedDB:PacmanDB): Promise<any> => {
    if (!parsedDB[localDBElement.name]) {
        logger.warn(`Can not find package ${localDBElement.name} on repo ${repoName}. Trying to check if it is in a new repo...`);
        let newRepo = await resolveRepoChange(localDBElement.name);
        if (newRepo) {
            localDBElement.repo = newRepo;
        } else {
            return null;
        }
    }
    if (localDBElement.file_name !== parsedDB[localDBElement.name].file_name || localDBElement.repo !== repoName) {
        return {
            name: localDBElement.name,
            repo: localDBElement.repo,
            file_name: parsedDB[localDBElement.name].file_name,
            download_size: parsedDB[localDBElement.name].download_size,
            install_size: parsedDB[localDBElement.name].install_size,
            version: parsedDB[localDBElement.name].version,
            times_updated: localDBElement.times_updated + 1
        };
    }
    return null;
};

const syncLocalDBSingle = async (repo_name: string): Promise<void> => {
    let repoDbPath = path.join(MIRRORDIR, repo_name, `${repo_name}.db`);
    let _allRepoPkgs = await Packages.findAll({ where: { repo: repo_name } });
    let allRepoPkgs = _allRepoPkgs.map(value => {
        return {
            name: value.get('name') as string,
            repo: value.get('repo') as string,
            file_name: value.get('file_name') as string,
            times_updated: value.get('times_updated') as number
        }
    });
    return parseDB(repoDbPath).then(parsedDB => {
        let resultPromises: Promise<any>[] = [];
        allRepoPkgs.forEach(element => {
            let resultPromise = checkSinglePakage(repo_name, element, parsedDB);
            resultPromises.push(resultPromise);
        });
        return Promise.all(resultPromises).then(results => {
            return results.filter(value => value !== null);
        }).then(results => {
            return Packages.bulkCreate(results, {
                updateOnDuplicate: ['repo', 'file_name', 'version', 'times_updated', 'download_size', 'install_size'],
                validate: true
            });
        }).catch(err => {
            logger.error(`An unexpected error occurred while syncing local DB for repo ${repo_name}: ${err}`);
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
                logger.verbose(`DB is up to date for ${repo_name}. Syncing without downloading...`);
                await syncLocalDBSingle(repo_name);
                logger.verbose(`DB sync finished...${repo_name}`);
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
            if (FILES_FILE_SYNC_INTERVAL > -1 && (Date.now() - await getValue(`last_files_file_sync_${repo_name}`, 0)) > (1000 * FILES_FILE_SYNC_INTERVAL)) {
                logger.verbose(`Downloading files file for ${repo_name}...`);
                await downloadFile(files_file_url, localFilesFilePath);
                await setValue(`last_files_file_sync_${repo_name}`, Date.now());
            }
            else {
                logger.verbose(`Files file skipped for ${repo_name}...`);
            }
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
