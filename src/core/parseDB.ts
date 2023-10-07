import child_process from 'child_process';
import path from 'path';
import fs from 'fs';
import { downloadFile } from './downloader';
import { TEMP_DIRECTORY } from '../config';
import logger from '../logger';
import { PacmanPackage, PacmanDB } from '../types';

const parsePackageDesc = async (
  descPath: fs.PathLike,
): Promise<PacmanPackage> => {
  return Promise.resolve().then((_) => {
    const descFile = fs.readFileSync(descPath, { encoding: 'utf-8' });
    const name = Array.from(descFile.matchAll(/%NAME%\n([^\n]+)/g))[0][1];
    const version = Array.from(descFile.matchAll(/%VERSION%\n([^\n]+)/g))[0][1];
    const fileName = Array.from(
      descFile.matchAll(/%FILENAME%\n([^\n]+)/g),
    )[0][1];
    const downloadSize = parseInt(
      Array.from(descFile.matchAll(/%CSIZE%\n([^\n]+)/g))[0][1],
    );
    const installSize = parseInt(
      Array.from(descFile.matchAll(/%ISIZE%\n([^\n]+)/g))[0][1],
    );
    const md5sum = Array.from(descFile.matchAll(/%MD5SUM%\n([^\n]+)/g))[0][1];
    const sha256sum = Array.from(
      descFile.matchAll(/%SHA256SUM%\n([^\n]+)/g),
    )[0][1];
    return {
      name,
      fileName,
      version,
      downloadSize,
      installSize,
      md5sum,
      sha256sum,
    };
  });
};

const parseLocalDB = async (dbPath: string): Promise<PacmanDB> => {
  const extractDir = path.join(
    TEMP_DIRECTORY,
    path.basename(dbPath).slice(0, -3),
  );
  if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, { recursive: true });
  }
  fs.mkdirSync(extractDir);
  if (!dbPath.startsWith('/')) {
    dbPath = path.join(process.cwd(), dbPath);
  }
  child_process.execSync(`bsdtar -xf ${dbPath}`, { cwd: extractDir });

  const parsePackagePromises: Promise<PacmanPackage>[] = [];
  fs.readdirSync(extractDir).forEach((value) => {
    parsePackagePromises.push(
      parsePackageDesc(path.join(extractDir, value, 'desc')),
    );
  });
  return Promise.allSettled(parsePackagePromises).then((values) => {
    const fulfilled = values.filter(
      (value) => value.status === 'fulfilled',
    ) as PromiseFulfilledResult<PacmanPackage>[];
    const results: PacmanPackage[] = fulfilled.map((value) => value.value);
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
    fs.rmSync(extractDir, { recursive: true });
    return parsedDB;
  });
};

const parseDB = async (dbURI: string): Promise<PacmanDB> => {
  if (!fs.existsSync(TEMP_DIRECTORY)) {
    fs.mkdirSync(TEMP_DIRECTORY);
  }
  const isURL = dbURI.startsWith('http://') || dbURI.startsWith('https://');
  if (!isURL) {
    return parseLocalDB(dbURI);
  }

  const dbPath = path.join(TEMP_DIRECTORY, path.basename(dbURI));
  return downloadFile(dbURI, dbPath).then((_) => {
    const parsedDB = parseLocalDB(dbPath);
    parsedDB.then((_) => {
      fs.rmSync(dbPath);
    });
    return parsedDB;
  });
};

export default parseDB;
