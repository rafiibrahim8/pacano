import { Sequelize, DataTypes } from 'sequelize';

const Repos = (sequelize: Sequelize): void => {
    sequelize.define('Repos', {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true,
        },
        etag: {
            type: DataTypes.STRING,
        },
        last_modified: {
            type: DataTypes.STRING,
        },
        use_mirror: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    });
};

export default Repos;
