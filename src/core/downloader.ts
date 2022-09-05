import axios from "axios";
import fs from "fs";
import fs_extra from "fs-extra";
import path from "path";
import crypto from "crypto";
import assert  from "assert";
import logger from "../logger";
import { spawnSync } from "child_process";
import { CURL_PATH, DOWNLOADER } from "../config";

const TEMP_DL_DIR = '/tmp/pacano-dl';

const downloadFileAxios = async (url: string, downloadPath: string): Promise<void> => {
    logger.verbose(`Downloading file using axios from: ${url}`);
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

const downloadFileCurl = async (url: string, downloadPath: string, download_size: number): Promise<void> => {
    let args: string[] = ['--silent', '--fail-with-body', '--location', '--speed-limit', '1024', '--speed-time', '10', '--connect-timeout', '2', '--max-time', '3600', '--output', downloadPath, url];
    if (download_size > 0) {
        args.push('--max-filesize', `${download_size}`);
    }
    logger.verbose(`Downloading file using cURL from: ${url}`);
    let status =  spawnSync(CURL_PATH, args, { stdio: 'inherit' }).status;
    assert(status === 0, `Failed to download file from ${url}`);
    if (download_size > 0 && fs.statSync(downloadPath).size !== download_size) {
        logger.warn(`Downloaded file: ${url} size is not equal to expected size.`);
        fs.rmSync(downloadPath);
        throw new Error(`Downloaded file size is not equal to expected size.`);
    }
}

const downloadFile = async (url: string, downloadPath: string, download_size: number = 0): Promise<void> => {
    fs.mkdirSync(TEMP_DL_DIR, { recursive: true });
    let tempFile = path.join(TEMP_DL_DIR, crypto.randomBytes(32).toString('hex'));
    if (DOWNLOADER.toLocaleLowerCase() === 'axios') {
        return downloadFileAxios(url, tempFile).then(_ => {
            return fs_extra.move(tempFile, downloadPath, { overwrite: true });
        });
    }
    else {
        return downloadFileCurl(url, tempFile, download_size).then(_ => {
            return fs_extra.move(tempFile, downloadPath, { overwrite: true });
        });
    }
}

export { downloadFile };
