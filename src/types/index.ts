export interface Package {
  name: string;
  repo: string;
  version: string;
  fileName: string;
  downloadSize: number;
  installSize: number;
  timesUpdated: number;
  md5sum?: string | undefined;
  sha256sum?: string | undefined;
}

export type PacmanPackage = Omit<Package, 'timesUpdated' | 'repo'>;
export type PackageNameOnly = Pick<Package, 'name'>;
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

export interface PacmanDB {
  [key: string]: PacmanPackage;
}

export enum PackageChangeType {
  UPDATE = 'update',
  DELETE = 'delete',
}

export type PackageChange =
  | {
      type: PackageChangeType.UPDATE;
      data: Package;
    }
  | {
      type: PackageChangeType.DELETE;
      data: PackageNameOnly;
    };

export interface RemotePackage {
  repo: string;
  pkgver: string;
  filename: string;
  compressed_size: number;
  installed_size: number;
}
