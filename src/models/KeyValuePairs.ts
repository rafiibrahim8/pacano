import { Sequelize, DataTypes } from "sequelize";

const KeyValuePairs = (sequelize: Sequelize): void => {
    sequelize.define('KeyValuePairs', {
        key: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true
        },
        value: {
            type: DataTypes.STRING,
            allowNull: false,
        }
    });
}

export default KeyValuePairs;
