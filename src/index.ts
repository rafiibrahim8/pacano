import syncMain from './core';
import app from './server';
import logger from './logger';
import { connectOrExit } from './models';
import { assertBsdtar } from './utils';
import { PORT } from './config';

const start = async () => {
    logger.info('Starting pacano...');
    assertBsdtar();
    await connectOrExit();

    app.listen(PORT, () => {
        logger.info(`Server started on port ${PORT}.`);
    });
    syncMain();
};

start();
