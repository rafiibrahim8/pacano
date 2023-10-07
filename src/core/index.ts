import downloadPkgs from './downloadPkgs';
import syncDB from './syncDB';
import removeOldPkgs from './removeOldPkgs';
import { waitSeconds } from './utils';
import { SYNC_INTERVAL } from '../config';
import logger from '../logger';
import { testFunc } from './testx';

const syncMainImpl = async () => {
  logger.verbose('Syncing DB....');
  await syncDB();
  logger.verbose('Downloading Packages....');
  await downloadPkgs();
  logger.verbose('Removing Old Packages....');
  await removeOldPkgs();
};

const syncMain = async (): Promise<never> => {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    logger.verbose('Mirroring...');
    // await syncMainImpl();
    await testFunc();
    logger.verbose('Going to sleep...');
    await waitSeconds(SYNC_INTERVAL);
  }
};

export default syncMain;
