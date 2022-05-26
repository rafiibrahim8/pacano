import { Sequelize, DataTypes } from "sequelize";
import Repos from "./Repos";

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
            references:{
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
        times_updated: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }
    });
}

export default Packages;
