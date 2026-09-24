import { db, now, toISODate } from './db';

interface Package {
    name: string;
    repo: string;
    file_name: string | null;
    version: string | null;
    download_size: number | null;
    install_size: number | null;
    md5sum: string | null;
    sha256sum: string | null;
    times_updated: number | null;
    createdAt: string;
    updatedAt: string;
}

const FIELDS = [
    'name',
    'repo',
    'file_name',
    'version',
    'download_size',
    'install_size',
    'md5sum',
    'sha256sum',
    'times_updated',
] as const;

const REQUIRED_FIELDS = ['name', 'repo'] as const;

const createTable = (): void => {
    db.run(
        'CREATE TABLE IF NOT EXISTS `Packages` (`name` VARCHAR(255) NOT NULL PRIMARY KEY, `repo` VARCHAR(255) NOT NULL REFERENCES `Repos` (`name`), `file_name` VARCHAR(255), `version` VARCHAR(255), `download_size` INTEGER, `install_size` INTEGER, `md5sum` VARCHAR(255), `sha256sum` VARCHAR(255), `times_updated` INTEGER DEFAULT 0, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL);',
    );
};

const findAllByRepo = (repo: string): Package[] =>
    db
        .query(
            'SELECT `name`, `repo`, `file_name`, `version`, `download_size`, `install_size`, `md5sum`, `sha256sum`, `times_updated`, `createdAt`, `updatedAt` FROM `Packages` AS `Packages` WHERE `Packages`.`repo` = ?;',
        )
        .all(repo) as Package[];

const findNames = (): string[] =>
    (
        db.query('SELECT `name` FROM `Packages` AS `Packages`;').all() as {
            name: string;
        }[]
    ).map((p) => p.name);

const findNamesByRepo = (repo: string): string[] =>
    (
        db
            .query(
                'SELECT `name` FROM `Packages` AS `Packages` WHERE `Packages`.`repo` = ?;',
            )
            .all(repo) as { name: string }[]
    ).map((p) => p.name);

const findOne = (name: string): Package | null =>
    db
        .query(
            'SELECT `name`, `repo`, `file_name`, `version`, `download_size`, `install_size`, `md5sum`, `sha256sum`, `times_updated`, `createdAt`, `updatedAt` FROM `Packages` AS `Packages` WHERE `Packages`.`name` = ?;',
        )
        .get(name) as Package | null;

const bulkCreate = (records: any[], updateOnDuplicate: string[]): void => {
    for (const record of records) {
        for (const field of REQUIRED_FIELDS) {
            if (record?.[field] === undefined || record?.[field] === null) {
                throw new Error(
                    `notNull Violation: Packages.${field} cannot be null`,
                );
            }
        }
    }
    if (records.length === 0) {
        return;
    }
    const timestamp = now();
    const insert = db.query(
        `INSERT INTO \`Packages\` (${FIELDS.map((f) => `\`${f}\``).join(
            ',',
        )},\`createdAt\`,\`updatedAt\`) VALUES (${FIELDS.map(() => '?').join(
            ',',
        )},?,?) ON CONFLICT (\`name\`) DO UPDATE SET ${updateOnDuplicate
            .map((f) => `\`${f}\`=EXCLUDED.\`${f}\``)
            .join(',')};`,
    );
    db.transaction(() => {
        for (const record of records) {
            insert.run(
                ...FIELDS.map((field) =>
                    field === 'times_updated' && record[field] === undefined
                        ? 0
                        : (record[field] ?? null),
                ),
                timestamp,
                timestamp,
            );
        }
    })();
};

const destroy = (names: any[]): number =>
    db
        .query(
            'DELETE FROM `Packages` WHERE `name` IN (SELECT `value` FROM json_each(?))',
        )
        .run(JSON.stringify(names)).changes;

const destroyByRepo = (repo: string): number =>
    db.query('DELETE FROM `Packages` WHERE `repo` = ?').run(repo).changes;

const toJSON = (pkg: Package): Package => ({
    ...pkg,
    createdAt: toISODate(pkg.createdAt),
    updatedAt: toISODate(pkg.updatedAt),
});

export default {
    createTable,
    findAllByRepo,
    findNames,
    findNamesByRepo,
    findOne,
    bulkCreate,
    destroy,
    destroyByRepo,
    toJSON,
};
export type { Package };
