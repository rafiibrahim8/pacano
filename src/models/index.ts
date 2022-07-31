import { Sequelize } from "sequelize";
import { logSequelize } from "../logger";
import Packages from "./Packages";
import Repos from "./Repos";
import KeyValuePairs from "./KeyValuePairs";

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'database.sqlite',
    logging: logSequelize
});

Packages(sequelize);
Repos(sequelize);
KeyValuePairs(sequelize);

sequelize.sync();

const hasConnection = async (): Promise<boolean> => {
    return sequelize.authenticate().then(_ => {
        return true;
    }).catch(_ => {
        return false;
    });
}

const connectOrExit = async (): Promise<void> => {
    await sequelize.sync()
    let success = await hasConnection();
    if (!success) {
        console.log('DB connection failed!');
        process.exit(1);
    }
}

export { sequelize, connectOrExit, hasConnection };
