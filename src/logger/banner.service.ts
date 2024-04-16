/**
 * Das Modul enthält die Funktion, um die Test-DB neu zu laden.
 * @packageDocumentation
 */

import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { release, type, userInfo } from 'node:os';
import { dbType } from '../config/db.js';
import figlet from 'figlet';
import { getLogger } from './logger.js';
import { nodeConfig } from '../config/node.js';
import process from 'node:process';

/**
 * Beim Start ein Banner ausgeben durch `onApplicationBootstrap()`.
 */
@Injectable()
export class BannerService implements OnApplicationBootstrap {
    readonly #logger = getLogger(BannerService.name);

    /**
     * Die Test-DB wird im Development-Modus neu geladen.
     */
    onApplicationBootstrap() {
        const { host, nodeEnv, port } = nodeConfig;
        figlet('haus', (_, data) => console.info(data));
        // https://nodejs.org/api/process.html
        // "Template String" ab ES 2015
        this.#logger.info('Node: %s', process.version);
        this.#logger.info('NODE_ENV: %s', nodeEnv);
        this.#logger.info('Rechnername: %s', host);
        this.#logger.info('Port: %s', port);
        this.#logger.info('DB-System: %s', dbType);
        this.#logger.info('Betriebssystem: %s (%s)', type(), release());
        this.#logger.info('Username: %s', userInfo().username);
        this.#logger.info('Swagger UI: /swagger');
    }
}
