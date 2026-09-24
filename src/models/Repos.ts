import { db, now, toISODate } from './db';

interface Repo {
    name: string;
    etag: string | null;
    last_modified: string | null;
    use_mirror: string;
    createdAt: string;
    updatedAt: string;
}

type RepoValues = Partial<Pick<Repo, 'etag' | 'last_modified' | 'use_mirror'>>;

const createTable = (): void => {
    db.run(
        'CREATE TABLE IF NOT EXISTS `Repos` (`name` VARCHAR(255) NOT NULL PRIMARY KEY, `etag` VARCHAR(255), `last_modified` VARCHAR(255), `use_mirror` VARCHAR(255) NOT NULL, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL);',
    );
};

const findAll = (): Repo[] =>
    db
        .query(
            'SELECT `name`, `etag`, `last_modified`, `use_mirror`, `createdAt`, `updatedAt` FROM `Repos` AS `Repos`;',
        )
        .all() as Repo[];

const findNames = (): string[] =>
    (
        db.query('SELECT `name` FROM `Repos` AS `Repos`;').all() as {
            name: string;
        }[]
    ).map((r) => r.name);

const findOne = (name: string): Repo | null =>
    db
        .query(
            'SELECT `name`, `etag`, `last_modified`, `use_mirror`, `createdAt`, `updatedAt` FROM `Repos` AS `Repos` WHERE `Repos`.`name` = ?;',
        )
        .get(name) as Repo | null;

const create = (name: string, use_mirror: string): void => {
    const timestamp = now();
    db.query(
        'INSERT INTO `Repos` (`name`,`use_mirror`,`createdAt`,`updatedAt`) VALUES (?,?,?,?);',
    ).run(name, use_mirror, timestamp, timestamp);
};

const update = (name: string, values: RepoValues): void => {
    const entries: [string, string | null][] = Object.entries(values).filter(
        ([, value]) => value !== undefined,
    );
    entries.push(['updatedAt', now()]);
    db.query(
        `UPDATE \`Repos\` SET ${entries
            .map(([key]) => `\`${key}\`=?`)
            .join(',')} WHERE \`name\` = ?`,
    ).run(...entries.map(([, value]) => value), name);
};

const destroy = (name: string): number =>
    db.query('DELETE FROM `Repos` WHERE `name` = ?').run(name).changes;

const toJSON = (repo: Repo): Repo => ({
    ...repo,
    createdAt: toISODate(repo.createdAt),
    updatedAt: toISODate(repo.updatedAt),
});

export default {
    createTable,
    findAll,
    findNames,
    findOne,
    create,
    update,
    destroy,
    toJSON,
};
export type { Repo };
