import path from 'node:path';
import fs from 'node:fs';
import { Packages, Repos, Repo } from '../models';
import { downloadFile, Checksums } from './downloader';
import { getMirrors, FileExistMap } from './utils';
import { MIRRORDIR } from '../config';
import logger from '../logger';

const downloadSinglePackage = async (
    repo_name: string,
    use_mirror: string,
    file_name: string,
    download_size: number,
    checksums: Checksums = undefined,
): Promise<boolean> => {
    const urls = await getMirrors(use_mirror, repo_name, 'package');
    for (let url of urls) {
        url = `${url}/${file_name}`;
        const localFilePath = path.join(MIRRORDIR, repo_name, file_name);
        try {
            await downloadFile(`${url}.sig`, `${localFilePath}.sig`); // Download `.sig` frist. Reson: issue #1
            await downloadFile(url, localFilePath, download_size, checksums);
            return true;
        } catch {}
    }
    return false;
};

const downloadSingleRepo = async (repo: Repo): Promise<void> => {
    const use_mirror = repo.use_mirror;
    const repo_name = repo.name;
    const _allRepoPkgs = Packages.findAllByRepo(repo_name);
    const allFilesDB = _allRepoPkgs
        .map((value) => {
            return {
                file_name: value.file_name as string,
                download_size: value.download_size as number,
                md5sum: value.md5sum ?? undefined,
                sha256sum: value.sha256sum ?? undefined,
            };
        })
        // Known issue: a package never found upstream has a null file_name, which throws here and skips downloads for the whole repo.
        .sort((a, b) =>
            a.file_name.localeCompare(b.file_name, undefined, {
                sensitivity: 'base',
            }),
        );
    const _allFilesDisk = await fs.promises.readdir(
        path.join(MIRRORDIR, repo_name),
    );
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
            logger.warn(
                `Can not download file ${i.file_name} of repo ${repo_name}`,
            );
        }
    }
};

const downloadPkgs = async (): Promise<void> => {
    const repos = Repos.findAll();
    for (const repo of repos) {
        try {
            await downloadSingleRepo(repo);
        } catch (err) {
            logger.error(
                `Failed to download file from repo: ${repo.name}. Reason: ${err}`,
            );
        }
    }
};

export default downloadPkgs;
