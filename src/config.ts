import dotenv from 'dotenv';
dotenv.config();

const TEMP_DIRECTORY = process.env.TEMP_DIRECTORY || '/tmp/pacano';
const MIRRORDIR = process.env.MIRRORDIR || '/var/archlinux';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_FILENAME = process.env.LOG_FILENAME || 'pacano.log.txt';
const SYNC_INTERVAL = process.env.SYNC_INTERVAL
  ? parseInt(process.env.SYNC_INTERVAL)
  : 5400;
const PORT = process.env.PORT || 8000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const UPSTREAM_MIRRORS = process.env.UPSTREAM_MIRRORS || 'mirrors.json';
const FILES_FILE_SYNC_INTERVAL = process.env.FILES_FILE_SYNC_INTERVAL
  ? parseInt(process.env.FILES_FILE_SYNC_INTERVAL)
  : 0;
const DOWNLOADER = process.env.DOWNLOADER || 'curl';
const CURL_PATH = process.env.CURL_PATH || 'curl';
const REMOVE_IF_PACKAGE_NOT_FOUND =
  parseInt(process.env.REMOVE_IF_PACKAGE_NOT_FOUND || '0') === 1;

export {
  MIRRORDIR,
  TEMP_DIRECTORY,
  LOG_LEVEL,
  LOG_FILENAME,
  SYNC_INTERVAL,
  PORT,
  ADMIN_TOKEN,
  UPSTREAM_MIRRORS,
  FILES_FILE_SYNC_INTERVAL,
  DOWNLOADER,
  CURL_PATH,
  REMOVE_IF_PACKAGE_NOT_FOUND,
};
