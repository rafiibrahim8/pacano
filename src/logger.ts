import winston from 'winston';
import { LOG_LEVEL, LOG_FILENAME } from './config';

const colors = {
    cyan: '\u001b[36m',
    end: '\u001b[0m',
};

const timestampFormat = (color = false): winston.Logform.Format => {
    return winston.format(function (info: winston.Logform.TransformableInfo) {
        let timestamp = `[${new Date().toISOString()}]`;
        info.level = color
            ? `${colors.cyan}${timestamp}${colors.end} ${info.level}`
            : `${timestamp} ${info.level}`;
        return info;
    })();
};

const logMsgFormat = (): winston.Logform.Format => {
    return winston.format(function (info: winston.Logform.TransformableInfo) {
        const message = JSON.stringify(info.message);
        if (message.startsWith('"') && message.endsWith('"')) {
            info.message = message.slice(1, -1);
        }
        return info;
    })();
};

const logger = winston.createLogger({
    level: LOG_LEVEL,
    transports: [
        new winston.transports.File({
            filename: LOG_FILENAME,
            format: winston.format.combine(
                timestampFormat(),
                logMsgFormat(),
                winston.format.simple(),
            ),
        }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                timestampFormat(true),
                logMsgFormat(),
                winston.format.simple(),
            ),
        }),
    ],
});

const logSequelize = (...data: any) => {
    logger.debug(`[Sequelize] ${data[0]}`);
};

export default logger;
export { logSequelize };
