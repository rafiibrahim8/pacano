import axios from 'axios';
import fs from 'fs';
import fs_extra from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import logger from '../logger';
import { CURL_PATH, DOWNLOADER } from '../config';
import { spawnPromise, spawnPromiseStrict } from '../utils';

const TEMP_DL_DIR = '/tmp/pacano-dl';

type Checksums =
    | {
          md5sum?: string;
          sha256sum?: string;
      }
    | undefined;

const removeFileIfExist = async (filePath: string): Promise<void> => {
    try {
        await fs.promises.rm(filePath);
    } catch (err: any) {
        if (err.code !== 'ENOENT') {
            throw err;
        }
    }
};

const checkChecksums = async (
    filePath: string,
    checksums: Checksums,
): Promise<void> => {
    if (checksums?.sha256sum) {
        logger.verbose(`Checking SHA256 checksum of ${filePath}`);
        const sha256sum = (
            await spawnPromise('sha256sum', [filePath], {
                encoding: 'utf-8',
            })
        ).stdout
            .trim()
            .split(' ')[0];
        if (sha256sum === checksums.sha256sum) {
            logger.verbose(`Matched SHA256 checksum of ${filePath}`);
            return;
        }
    }
    if (checksums?.md5sum) {
        logger.verbose(`Checking MD5 checksum of ${filePath}`);
        const md5sum = (
            await spawnPromise('md5sum', [filePath], {
                encoding: 'utf-8',
            })
        ).stdout
            .trim()
            .split(' ')[0];
        if (md5sum === checksums.md5sum) {
            logger.verbose(`Matched MD5 checksum of ${filePath}`);
            return;
        }
    }
    logger.error(`Checksums of ${filePath} do not match.`);
    throw new Error(`Checksums of ${filePath} do not match.`);
};

const checkIfSizeCorrect = async (
    filePath: string,
    download_size: number,
    checksums: Checksums = undefined,
): Promise<void> => {
    if (
        download_size === 0 ||
        (await fs.promises.stat(filePath)).size === download_size
    ) {
        return;
    }
    if (!(checksums?.md5sum || checksums?.sha256sum)) {
        const errorStr = `Downloaded file ${filePath} is not the correct size. And no checksums are provided.`;
        logger.error(errorStr);
        throw new Error(errorStr);
    }
    logger.warn(
        `Downloaded file ${filePath} is not the correct size. Checking checksums...`,
    );
    return checkChecksums(filePath, checksums);
};

const downloadFileAxios = async (
    url: string,
    downloadPath: string,
): Promise<void> => {
    logger.verbose(`Downloading file using axios from: ${url}`);
    const fileWrite = fs.createWriteStream(downloadPath);
    return axios.get(url, { responseType: 'stream' }).then((response) => {
        return new Promise<void>((resolve, reject) => {
            response.data.pipe(fileWrite);
            let error: any = null;
            fileWrite.on('error', (err) => {
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

const downloadFileCurl = async (
    url: string,
    downloadPath: string,
): Promise<void> => {
    const args: string[] = [
        '--silent',
        '--fail-with-body',
        '--location',
        '--speed-limit',
        '1024',
        '--speed-time',
        '10',
        '--connect-timeout',
        '2',
        '--max-time',
        '3600',
        '--output',
        downloadPath,
        url,
    ];
    logger.verbose(`Downloading file using cURL from: ${url}`);
    try {
        await spawnPromiseStrict(CURL_PATH, args, { stdio: 'inherit' });
    } catch (err) {
        throw new Error(`Failed to download file from ${url}`);
    }
};

const downloadFile = async (
    url: string,
    downloadPath: string,
    download_size: number = 0,
    checksums: Checksums = undefined,
): Promise<void> => {
    await fs.promises.mkdir(TEMP_DL_DIR, { recursive: true });
    const tempFile = path.join(
        TEMP_DL_DIR,
        crypto.randomBytes(32).toString('hex'),
    );
    const downloaderFunc =
        DOWNLOADER.toLocaleLowerCase() === 'axios'
            ? downloadFileAxios
            : downloadFileCurl;
    return downloaderFunc(url, tempFile)
        .then((_) => {
            return checkIfSizeCorrect(tempFile, download_size, checksums);
        })
        .then((_) => {
            fs_extra.moveSync(tempFile, downloadPath, { overwrite: true });
        })
        .catch((err) => {
            removeFileIfExist(tempFile);
            logger.error(`Downloading failed with error: ${err}`);
            throw err;
        });
};

export { downloadFile, Checksums };
