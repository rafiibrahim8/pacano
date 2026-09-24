import fs from 'node:fs';
import { UPSTREAM_MIRRORS } from '../config';
import { KeyValuePairs } from '../models';

interface EtagLastMod {
    etag?: string;
    last_modified?: string;
}

interface FileExistMap {
    [key: string]: boolean;
}

const fetchOk = async (url: string, init?: RequestInit): Promise<Response> => {
    const response = await fetch(url, init);
    if (!response.ok) {
        throw new Error(`Request failed with status code ${response.status}`);
    }
    return response;
};

const getEtagAndLastModified = async (url: string): Promise<EtagLastMod> => {
    return fetchOk(url, { method: 'HEAD' }).then((response) => {
        let etag = response.headers.get('etag') ?? undefined;
        let last_modified = response.headers.get('last-modified') ?? undefined;
        return { etag, last_modified };
    });
};

const getMirrors = async (
    mirror: string,
    repo: string,
    purpose = 'package',
): Promise<Array<string>> => {
    let mirrors = await fs.promises.readFile(UPSTREAM_MIRRORS, {
        encoding: 'utf8',
    });
    let arch = process.env.ARCH || 'x86_64';
    mirrors = mirrors.replaceAll('$repo', repo).replaceAll('$arch', arch);
    let mirror_list = JSON.parse(mirrors)[mirror];
    if (Array.isArray(mirror_list)) {
        return mirror_list as Array<string>;
    }
    let tier1: Array<string> = mirror_list['tier1'];
    let tier2: Array<string> = mirror_list['tier2'];
    if (purpose === 'package') {
        return tier2.concat(tier1);
    }
    return tier1.concat(tier2);
};

const waitSeconds = async (seconds: number) => {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

const setValue = async (key: string, value: any) => {
    KeyValuePairs.upsert(key, JSON.stringify(value));
};

const getValue = async (key: string, default_value: any = null) => {
    let value = KeyValuePairs.findOne(key);
    if (value) {
        return JSON.parse(value.value);
    }
    return default_value;
};

export {
    setValue,
    getValue,
    getMirrors,
    getEtagAndLastModified,
    fetchOk,
    waitSeconds,
};
export type { EtagLastMod, FileExistMap };
