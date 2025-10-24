import child_process from 'child_process';
import path from 'path';
import fs from 'fs';
import { downloadFile } from './downloader';
import { TEMP_DIRECTORY } from '../config';
import logger from '../logger';
import { spawnPromiseStrict } from '../utils';

export interface PackageDetails {
    name: string;
    version: string;
    file_name: string;
    download_size: number;
    install_size: number;
    md5sum?: string;
    sha256sum?: string;
}

export interface PacmanDB {
    [key: string]: PackageDetails;
}

const parsePackageDesc = async (
    descPath: fs.PathLike,
): Promise<PackageDetails> => {
    const descFile = await fs.promises.readFile(descPath, {
        encoding: 'utf-8',
    });
    const name = Array.from(descFile.matchAll(/%NAME%\n([^\n]+)/g))[0][1];
    const version = Array.from(descFile.matchAll(/%VERSION%\n([^\n]+)/g))[0][1];
    const file_name = Array.from(
        descFile.matchAll(/%FILENAME%\n([^\n]+)/g),
    )[0][1];
    const download_size = parseInt(
        Array.from(descFile.matchAll(/%CSIZE%\n([^\n]+)/g))[0][1],
    );
    const install_size = parseInt(
        Array.from(descFile.matchAll(/%ISIZE%\n([^\n]+)/g))[0][1],
    );
    const md5sum = Array.from(descFile.matchAll(/%MD5SUM%\n([^\n]+)/g))[0]?.[1];
    const sha256sum = Array.from(
        descFile.matchAll(/%SHA256SUM%\n([^\n]+)/g),
    )[0]?.[1];
    return {
        name,
        file_name,
        version,
        download_size,
        install_size,
        md5sum,
        sha256sum,
    };
};

const parseLocalDB = async (dbPath: string): Promise<PacmanDB> => {
    const extractDir = path.join(
        TEMP_DIRECTORY,
        path.basename(dbPath).slice(0, -3),
    );
    await fs.promises.rm(extractDir, { recursive: true, force: true });
    await fs.promises.mkdir(extractDir);
    if (!dbPath.startsWith('/')) {
        dbPath = path.join(process.cwd(), dbPath);
    }
    await spawnPromiseStrict('bsdtar', ['-xf', dbPath], { cwd: extractDir });

    const parsePackagePromises: Promise<PackageDetails>[] = (
        await fs.promises.readdir(extractDir)
    ).map(
        async (value) =>
            await parsePackageDesc(path.join(extractDir, value, 'desc')),
    );

    return Promise.allSettled(parsePackagePromises).then((values) => {
        const fulfilled = values.filter(
            (value) => value.status === 'fulfilled',
        ) as PromiseFulfilledResult<PackageDetails>[];
        const results: PackageDetails[] = fulfilled.map((value) => value.value);
        const rejected = values.filter(
            (value) => value.status === 'rejected',
        ) as PromiseRejectedResult[];
        if (rejected.length > 0) {
            logger.warn(`An error occurred while parsing local DB`);
        }

        const parsedDB: PacmanDB = {};

        results.forEach((value) => {
            parsedDB[value.name] = value;
        });
        fs.promises.rm(extractDir, { recursive: true });
        return parsedDB;
    });
};

const parseDB = async (dbURI: string): Promise<PacmanDB> => {
    await fs.promises.mkdir(TEMP_DIRECTORY, { recursive: true });
    const isURL = dbURI.startsWith('http://') || dbURI.startsWith('https://');
    if (!isURL) {
        return parseLocalDB(dbURI);
    }

    const dbPath = path.join(TEMP_DIRECTORY, path.basename(dbURI));
    await downloadFile(dbURI, dbPath);
    const parsedDB = await parseLocalDB(dbPath);
    await fs.promises.rm(dbPath);
    return parsedDB;
};

export default parseDB;
