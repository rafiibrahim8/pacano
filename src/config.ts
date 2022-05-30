import dotenv from "dotenv";
dotenv.config();

const TEMP_DIRECTORY = process.env.TEMP_DIRECTORY || '/tmp/pacano';
const MIRRORDIR = process.env.MIRRORDIR || '/var/archlinux';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_FILENAME = process.env.LOG_FILENAME || 'pacano.log.txt'
const SYNC_INTERVAL = process.env.SYNC_INTERVAL ? parseInt(process.env.SYNC_INTERVAL) : 5400;
const PORT = process.env.PORT || 8000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const UPSTREAM_MIRRORS = process.env.UPSTREAM_MIRRORS || 'mirrors.json';

export {
    MIRRORDIR,
    TEMP_DIRECTORY,
    LOG_LEVEL,
    LOG_FILENAME,
    SYNC_INTERVAL,
    PORT,
    ADMIN_TOKEN,
    UPSTREAM_MIRRORS
}
