import { Sequelize } from 'sequelize';
import { logSequelize } from '../logger';
import { defineKeyValuePairModel } from './keyValuePairModel';
import { defineRepoModel } from './repoModel';
import { definePackageModel } from './packageModel';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'database.sqlite',
  logging: logSequelize,
});

defineKeyValuePairModel(sequelize);
defineRepoModel(sequelize);
definePackageModel(sequelize);

const hasConnection = async (): Promise<boolean> => {
  return sequelize
    .authenticate()
    .then((_) => {
      return true;
    })
    .catch((_) => {
      return false;
    });
};

const connectOrExit = async (): Promise<void> => {
  await sequelize.sync();
  const success = await hasConnection();
  if (!success) {
    console.log('DB connection failed!');
    process.exit(1);
  }
};

export { connectOrExit, hasConnection };
