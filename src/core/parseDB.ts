import child_process from "child_process";
import path from "path";
import fs from "fs";
import { downloadFile } from "./utils";
import { TEMP_DIRECTORY } from "../config";

interface PackageDetails {
    name: string,
    version: string,
    file_name: string
}

interface PacmanDB {
    [key: string]: PackageDetails
}

const parsePackageDesc = async (descPath: fs.PathLike): Promise<PackageDetails> => {
    return Promise.resolve().then(_ => {
        let descFile = fs.readFileSync(descPath, { encoding: 'utf-8' });
        let name = Array.from(descFile.matchAll(/%NAME%\n([^\n]+)/g))[0][1];
        let version = Array.from(descFile.matchAll(/%VERSION%\n([^\n]+)/g))[0][1];
        let file_name = Array.from(descFile.matchAll(/%FILENAME%\n([^\n]+)/g))[0][1];
        return { name, file_name, version };
    });
};

const parseLocalDB = async (dbPath: string): Promise<PacmanDB> => {
    let extractDir = path.join(TEMP_DIRECTORY, path.basename(dbPath).slice(0, -3));
    if(fs.existsSync(extractDir)){
        fs.rmSync(extractDir, {recursive: true});
    }
    fs.mkdirSync(extractDir);
    if (!dbPath.startsWith('/')) {
        dbPath = path.join(process.cwd(), dbPath);
    }
    child_process.execSync(`bsdtar -xf ${dbPath}`, { cwd: extractDir })

    let parsePackagePromises: Promise<PackageDetails>[] = [];
    fs.readdirSync(extractDir).forEach((value) => {
        parsePackagePromises.push(parsePackageDesc(path.join(extractDir, value, 'desc')));
    });
    return Promise.allSettled(parsePackagePromises).then(values => {
        let fulfilled = values.filter((value) => value.status === 'fulfilled') as PromiseFulfilledResult<PackageDetails>[];
        let results: PackageDetails[] = fulfilled.map(value => value.value);
        let rejected = values.filter((value) => value.status === 'rejected') as PromiseRejectedResult[];

        let parsedDB: PacmanDB = {};

        results.forEach(value => {
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
    let isURL = dbURI.startsWith('http://') || dbURI.startsWith('https://');
    if (!isURL) {
        return parseLocalDB(dbURI);
    }

    let dbPath = path.join(TEMP_DIRECTORY, path.basename(dbURI));
    return downloadFile(dbURI, dbPath).then(_ => {
        let parsedDB = parseLocalDB(dbPath);
        parsedDB.then(_ => {
            fs.rmSync(dbPath);
        });
        return parsedDB;
    });
};

export default parseDB;
