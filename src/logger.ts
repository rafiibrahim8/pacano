import fs from 'node:fs';
import { LOG_LEVEL, LOG_FILENAME } from './config';

const levels: Record<string, number> = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6,
};

type Level = 'error' | 'warn' | 'info' | 'verbose' | 'debug';

const colors: Record<Level, string> = {
    error: '\u001b[31m',
    warn: '\u001b[33m',
    info: '\u001b[32m',
    verbose: '\u001b[36m',
    debug: '\u001b[34m',
};

const cyan = '\u001b[36m';
const reset = '\u001b[0m';
const resetForeground = '\u001b[39m';

const useColor = Boolean(process.stdout.isTTY);
const logFile = fs.createWriteStream(LOG_FILENAME, { flags: 'a' });

const formatMessage = (message: string): string => {
    const json = JSON.stringify(message);
    return json.startsWith('"') && json.endsWith('"')
        ? json.slice(1, -1)
        : message;
};

const log = (level: Level, message: string): void => {
    const maxLevel = levels[LOG_LEVEL];
    if (!(maxLevel >= levels[level])) {
        return;
    }
    const timestamp = `[${new Date().toISOString()}]`;
    const msg = formatMessage(message);
    logFile.write(`${timestamp} ${level}: ${msg}\n`);
    process.stdout.write(
        useColor
            ? `${cyan}${timestamp}${reset} ${colors[level]}${level}${resetForeground}: ${msg}\n`
            : `${timestamp} ${level}: ${msg}\n`,
    );
};

const logger = {
    error: (message: string) => log('error', message),
    warn: (message: string) => log('warn', message),
    info: (message: string) => log('info', message),
    verbose: (message: string) => log('verbose', message),
    debug: (message: string) => log('debug', message),
};

export default logger;
