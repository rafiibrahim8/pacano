import axios from "axios";
import fs from "fs";
import fs_extra from "fs-extra";
import path from "path";
import crypto from "crypto";
import logger from "../logger";
import { UPSTREAM_MIRRORS } from "../config";

interface EtagLastMod {
    etag: string,
    last_modified: string
}

interface FileExistMap {
    [key: string]: boolean
}

const getEtagAndLastModified = async (url: string): Promise<EtagLastMod> => {
    return axios.head(url).then(response => {
        let etag = response.headers['etag'];
        let last_modified = response.headers['last-modified'];
        return { etag, last_modified };
    });
};

const downloadFileImpl = async (url: string, downloadPath: string): Promise<void> => {
    logger.verbose(`Downloading file from... ${url}`);
    let fileWrite = fs.createWriteStream(downloadPath);
    return axios.get(url, { responseType: 'stream' }).then(response => {
        return new Promise((resolve, reject) => {
            response.data.pipe(fileWrite);
            let error: any = null;
            fileWrite.on('error', err => {
                error = err;
                fileWrite.close();
                reject(err);
            });
            fileWrite.on('close', () => {
                if (!error) {
                    resolve();
                }
            });
        });
    });
};

const downloadFile = async (url: string, downloadPath: string): Promise<void> => {
    let tempFile = path.join('/tmp', crypto.randomBytes(32).toString('hex'));
    return downloadFileImpl(url, tempFile).then(_ => {
        return fs_extra.move(tempFile, downloadPath, {overwrite: true});
    });
}

const getMirrors = (mirror: string, repo: string, purpose = 'package'): Array<string> => {
    let mirrors = fs.readFileSync(UPSTREAM_MIRRORS, { encoding: "utf8" });
    let arch = process.env.ARCH || 'x86_64';
    mirrors = mirrors.replaceAll('$repo', repo).replaceAll('$arch', arch);
    let mirror_list = JSON.parse(mirrors)[mirror];
    if (Array.isArray(mirror_list)) {
        return mirror_list as Array<string>;
    }
    let tier1: Array<string> = mirror_list['tier1'];
    let tier2: Array<string> = mirror_list['tier2'];
    if (purpose === 'package') {
        return tier2.concat(tier1);
    }
    return tier1.concat(tier2);

};

const waitSeconds = async (seconds: number) => {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

export { downloadFile, getMirrors, getEtagAndLastModified, waitSeconds, EtagLastMod, FileExistMap };
