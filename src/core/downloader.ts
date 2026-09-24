import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import logger from '../logger';
import { CURL_PATH, DOWNLOADER, TEMP_DIRECTORY_DL } from '../config';
import { spawnPromise, spawnPromiseStrict } from '../utils';
import { fetchOk } from './utils';

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
    const expectedVsActual: Record<
        string,
        { expected: string; actual: string }
    > = {};
    if (checksums?.sha256sum) {
        logger.verbose(`Checking SHA256 checksum of ${filePath}`);
        const sha256sum = (await spawnPromise('sha256sum', [filePath])).stdout
            .trim()
            .split(' ')[0];
        expectedVsActual['sha256sum'] = {
            expected: checksums.sha256sum,
            actual: sha256sum,
        };
        if (sha256sum === checksums.sha256sum) {
            logger.verbose(`Matched SHA256 checksum of ${filePath}`);
            return;
        }
    }
    if (checksums?.md5sum) {
        logger.verbose(`Checking MD5 checksum of ${filePath}`);
        const md5sum = (await spawnPromise('md5sum', [filePath])).stdout
            .trim()
            .split(' ')[0];
        expectedVsActual['md5sum'] = {
            expected: checksums.md5sum,
            actual: md5sum,
        };
        if (md5sum === checksums.md5sum) {
            logger.verbose(`Matched MD5 checksum of ${filePath}`);
            return;
        }
    }
    logger.error(
        `Checksums of ${filePath} do not match.\n${JSON.stringify(
            expectedVsActual,
        )}`,
    );
    throw new Error(`Checksums of ${filePath} do not match.`);
};

const checkIfSizeCorrect = async (
    filePath: string,
    download_size: number,
    checksums: Checksums = undefined,
): Promise<void> => {
    const actualSize = (await fs.promises.stat(filePath)).size;
    if (download_size === 0 || actualSize === download_size) {
        return;
    }
    logger.warn(
        `Downloaded file ${filePath} is not the correct size (expected ${download_size} got ${actualSize}). Checking checksums...`,
    );
    if (!(checksums?.md5sum || checksums?.sha256sum)) {
        const errorStr = `No checksums are provided.`;
        logger.error(errorStr);
        throw new Error(errorStr);
    }
    return checkChecksums(filePath, checksums);
};

const moveFile = async (src: string, dest: string): Promise<void> => {
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });
    try {
        await fs.promises.rename(src, dest);
    } catch (err: any) {
        if (err.code !== 'EXDEV') {
            throw err;
        }
        await fs.promises.copyFile(src, dest);
        await fs.promises.rm(src);
    }
};

const downloadFileFetch = async (
    url: string,
    downloadPath: string,
): Promise<void> => {
    logger.verbose(`Downloading file using fetch from: ${url}`);
    await Bun.write(downloadPath, await fetchOk(url));
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
    await fs.promises.mkdir(TEMP_DIRECTORY_DL, { recursive: true });
    const tempFile = path.join(
        TEMP_DIRECTORY_DL,
        crypto.randomBytes(32).toString('hex'),
    );
    const downloaderFunc =
        DOWNLOADER.toLocaleLowerCase() === 'axios'
            ? downloadFileFetch
            : downloadFileCurl;
    return downloaderFunc(url, tempFile)
        .then((_) => {
            return checkIfSizeCorrect(tempFile, download_size, checksums);
        })
        .then((_) => {
            return moveFile(tempFile, downloadPath);
        })
        .catch(async (err) => {
            await removeFileIfExist(tempFile).catch(() => {});
            logger.error(`Downloading failed with error: ${err}`);
            throw err;
        });
};

export { downloadFile };
export type { Checksums };
