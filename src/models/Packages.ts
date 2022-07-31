import { Sequelize, DataTypes } from "sequelize";

const Packages = (sequelize: Sequelize): void => {
    sequelize.define('Packages', {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true
        },
        repo: {
            type: DataTypes.STRING,
            allowNull: false,
            references: {
                model: 'Repos',
                key: 'name'
            }

        },
        file_name: {
            type: DataTypes.STRING,
        },
        version: {
            type: DataTypes.STRING,
        },
        download_size: {
            type: DataTypes.INTEGER,
        },
        install_size: {
            type: DataTypes.INTEGER,
        },
        times_updated: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }
    });
}

export default Packages;
