export interface Package {
  name: string;
  repo: string;
  version: string;
  fileName: string;
  downloadSize: number;
  installSize: number;
  timesUpdated: number;
  md5sum: string | undefined;
  sha256sum: string | undefined;
}

export interface Repo {
  name: string;
  useMirror: string;
  etag: string | undefined;
  lastModified: string | undefined;
}

export interface KeyValuePair {
  key: string;
  value: string;
}
