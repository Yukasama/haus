import { config } from './app.js';
import { env } from './env.js';
import { nodeConfig } from './node.js';
import pino from 'pino';
import { resolve } from 'node:path';

/**
 * Das Modul enthält die Konfiguration für den Logger.
 * @packageDocumentation
 */

const logDirDefault = 'log';
const logFileNameDefault = 'server.log';
const logFileDefault = resolve(logDirDefault, logFileNameDefault);

const { log } = config;
const { nodeEnv } = nodeConfig;

// Default-Einstellung fuer Logging
export const loggerDefaultValue =
    env.LOG_DEFAULT?.toLowerCase() === 'true' || log?.default === true;

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const logDir: string | undefined =
    (log?.dir as string | undefined) === undefined
        ? undefined
        : log.dir.trimEnd(); // eslint-disable-line @typescript-eslint/no-unsafe-call
const logFile =
    logDir === undefined ? logFileDefault : resolve(logDir, logFileNameDefault);
const pretty = log?.pretty === true;

let logLevel = 'info';
if (
    log?.level === 'debug' &&
    nodeEnv !== 'production' &&
    nodeEnv !== 'PRODUCTION' &&
    !loggerDefaultValue
) {
    logLevel = 'debug';
}

if (!loggerDefaultValue) {
    console.debug(
        `logger config: logLevel=${logLevel}, logFile=${logFile}, pretty=${pretty}, loggerDefaultValue=${loggerDefaultValue}`,
    );
}

export const parentLogger: pino.Logger<string> = loggerDefaultValue
    ? pino(pino.destination(logFileDefault))
    : pino({ level: logLevel });
