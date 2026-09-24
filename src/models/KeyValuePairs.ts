import { db, now } from './db';

interface KeyValuePair {
    key: string;
    value: string;
    createdAt: string;
    updatedAt: string;
}

const createTable = (): void => {
    db.run(
        'CREATE TABLE IF NOT EXISTS `KeyValuePairs` (`key` VARCHAR(255) NOT NULL PRIMARY KEY, `value` VARCHAR(255) NOT NULL, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL);',
    );
};

const findOne = (key: string): KeyValuePair | null =>
    db
        .query(
            'SELECT `key`, `value`, `createdAt`, `updatedAt` FROM `KeyValuePairs` AS `KeyValuePairs` WHERE `KeyValuePairs`.`key` = ?;',
        )
        .get(key) as KeyValuePair | null;

const upsert = (key: string, value: string): void => {
    const timestamp = now();
    db.query(
        'INSERT INTO `KeyValuePairs` (`key`,`value`,`createdAt`,`updatedAt`) VALUES (?,?,?,?) ON CONFLICT (`key`) DO UPDATE SET `key`=EXCLUDED.`key`,`value`=EXCLUDED.`value`,`updatedAt`=EXCLUDED.`updatedAt`;',
    ).run(key, value, timestamp, timestamp);
};

export default { createTable, findOne, upsert };
