import { Database } from 'bun:sqlite';

const db = new Database('database.sqlite');
db.run('PRAGMA foreign_keys = ON');

const now = (): string =>
    new Date().toISOString().replace('T', ' ').replace('Z', ' +00:00');

const toISODate = (value: string): string =>
    new Date(value.replace(' ', 'T').replace(' +00:00', 'Z')).toISOString();

export { db, now, toISODate };
