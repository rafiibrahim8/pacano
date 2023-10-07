import axios from 'axios';
import fs from 'fs';
import { UPSTREAM_MIRRORS } from '../config';
import { KeyValuePairModel } from '../models/keyValuePairModel';

const getEtagAndLastModified = async (
  url: string,
): Promise<[string, string]> => {
  return axios.head(url).then((response) => {
    const etag = response.headers['etag'];
    const last_modified = response.headers['last-modified'];
    return [etag, last_modified];
  });
};

const getMirrors = (
  mirror: string,
  repoName: string,
  purpose = 'package',
): Array<string> => {
  let mirrors = fs.readFileSync(UPSTREAM_MIRRORS, { encoding: 'utf8' });
  const arch = process.env.ARCH || 'x86_64';
  mirrors = mirrors.replaceAll('$repo', repoName).replaceAll('$arch', arch);
  const mirror_list = JSON.parse(mirrors)[mirror];
  if (Array.isArray(mirror_list)) {
    return mirror_list as Array<string>;
  }
  const tier1: Array<string> = mirror_list['tier1'];
  const tier2: Array<string> = mirror_list['tier2'];
  if (purpose === 'package') {
    return tier2.concat(tier1);
  }
  return tier1.concat(tier2);
};

const waitSeconds = async (seconds: number) => {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

const setValue = async (key: string, value: unknown): Promise<void> => {
  await KeyValuePairModel.upsert({ key, value: JSON.stringify(value) });
};

const getValue = async (key: string, defaultValue: unknown = null) => {
  const value = await KeyValuePairModel.findByPk(key);
  if (value) {
    return JSON.parse(value.value);
  }
  return defaultValue;
};

export { setValue, getValue, getMirrors, getEtagAndLastModified, waitSeconds };
