import { db } from './db';
import Packages from './Packages';
import Repos from './Repos';
import KeyValuePairs from './KeyValuePairs';

const hasConnection = async (): Promise<boolean> => {
    try {
        db.query('SELECT 1+1 AS result').get();
        return true;
    } catch {
        return false;
    }
};

const connectOrExit = async (): Promise<void> => {
    Repos.createTable();
    Packages.createTable();
    KeyValuePairs.createTable();
    let success = await hasConnection();
    if (!success) {
        console.log('DB connection failed!');
        process.exit(1);
    }
};

export { Packages, Repos, KeyValuePairs, connectOrExit, hasConnection };
export type { Package } from './Packages';
export type { Repo } from './Repos';
