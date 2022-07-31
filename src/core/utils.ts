import axios from "axios";
import fs from "fs";
import { UPSTREAM_MIRRORS } from "../config";
import { sequelize } from "../models";

const KeyValuePairs = sequelize.models.KeyValuePairs;

interface EtagLastMod {
    etag: string,
    last_modified: string
}

interface FileExistMap {
    [key: string]: boolean
}

const getEtagAndLastModified = async (url: string): Promise<EtagLastMod> => {
    return axios.head(url).then(response => {
        let etag = response.headers['etag'];
        let last_modified = response.headers['last-modified'];
        return { etag, last_modified };
    });
};

const getMirrors = (mirror: string, repo: string, purpose = 'package'): Array<string> => {
    let mirrors = fs.readFileSync(UPSTREAM_MIRRORS, { encoding: "utf8" });
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
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

const setValue = async (key: string, value: any) => {
    await KeyValuePairs.upsert({ key, value: JSON.stringify(value) });
}

const getValue = async (key: string, default_value: any = null) => {
    let value = await KeyValuePairs.findOne({ where: { key } });
    if (value) {
        return JSON.parse(value.get('value') as string);
    }
    return default_value;
}

export { setValue, getValue, getMirrors, getEtagAndLastModified, waitSeconds, EtagLastMod, FileExistMap };
