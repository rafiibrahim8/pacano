import axios from "axios";
import fs from "fs";
import path from "path";
import logger from "../logger";

interface EtagLastMod {
    etag: string,
    last_modified: string
}

interface FileExistMap {
    [key: string]: boolean
}

const getEtagAndLastModified = async (url: string): Promise<EtagLastMod> => {
    return axios.head(url).then(response => {
        let etag = response.headers['etag'] as string;
        let last_modified = response.headers['last-modified'] as string;
        return { etag, last_modified };
    });
};

const downloadFile = async (url: string, downloadPath: fs.PathLike): Promise<void> => {
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

const getMirrors = (mirror: string, repo: string, purpose = 'package'): Array<string> => {
    let mirrors = fs.readFileSync(path.join(__dirname, '..', '..', 'mirrors.json'), { encoding: "utf8" });
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
