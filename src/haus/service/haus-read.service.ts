/**
 * Das Modul besteht aus der Klasse {@linkcode HausReadService}.
 * @packageDocumentation
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { Haus } from './../entity/haus.entity.js';
import { QueryBuilder } from './query-builder.js';
import { type Suchkriterien } from './suchkriterien.js';
import { getLogger } from '../../logger/logger.js';

/**
 * Typdefinition für `findById`
 */
export interface FindByIdParams {
    /** ID des gesuchten Hauses */
    readonly id: number;
    /** Sollen die Personen mitgeladen werden? */
    readonly mitPersonen?: boolean;
}

/**
 * Die Klasse `HausReadService` implementiert das Lesen für Haeuser und greift
 * mit _TypeORM_ auf eine relationale DB zu.
 */
@Injectable()
export class HausReadService {
    static readonly ID_PATTERN = /^[1-9]\d{0,10}$/u;

    readonly #hausProps: string[];

    readonly #queryBuilder: QueryBuilder;

    readonly #logger = getLogger(HausReadService.name);

    constructor(queryBuilder: QueryBuilder) {
        const hausDummy = new Haus();
        this.#hausProps = Object.getOwnPropertyNames(hausDummy);
        this.#queryBuilder = queryBuilder;
    }

    /**
     * Ein Haus asynchron anhand seiner ID suchen
     * @param id ID des gesuchten Hauses
     * @returns Das gefundene Haus vom Typ [Haus](haus_entity_haus_entity.Haus.html)
     *          in einem Promise aus ES2015.
     * @throws NotFoundException falls kein Haus mit der ID existiert
     */
    async findById({ id, mitPersonen = false }: FindByIdParams) {
        this.#logger.debug('findById: id=%d', id);

        const haus = await this.#queryBuilder
            .buildId({ id, mitPersonen })
            .getOne();
        if (haus === null) {
            throw new NotFoundException(`Es gibt kein Haus mit der ID ${id}.`);
        }
        if (haus.features === null) {
            haus.features = [];
        }

        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug(
                'findById: haus=%s, adresse=%o',
                haus.toString(),
                haus.adresse,
            );
            if (mitPersonen) {
                this.#logger.debug('findById: Personen=%o', haus.personen);
            }
        }
        return haus;
    }

    /**
     * Haeuser asynchron suchen.
     * @param suchkriterien JSON-Objekt mit Suchkriterien
     * @returns Ein JSON-Array mit den gefundenen Haeusern.
     * @throws NotFoundException falls keine Haeuser gefunden wurden.
     */
    async find(suchkriterien?: Suchkriterien) {
        this.#logger.debug('find: suchkriterien=%o', suchkriterien);

        if (suchkriterien === undefined) {
            return this.#queryBuilder.build({}).getMany();
        }
        const keys = Object.keys(suchkriterien);
        if (keys.length === 0) {
            return this.#queryBuilder.build(suchkriterien).getMany();
        }

        if (!this.#checkKeys(keys)) {
            throw new NotFoundException('Ungueltige Suchkriterien');
        }

        const haeuser = await this.#queryBuilder.build(suchkriterien).getMany();
        if (haeuser.length === 0) {
            this.#logger.debug('find: Keine Haeuser gefunden');
            throw new NotFoundException(
                `Keine Haeuser gefunden: ${JSON.stringify(suchkriterien)}`,
            );
        }
        haeuser.forEach((haus) => {
            if (haus.features === null) {
                haus.features = [];
            }
        });
        this.#logger.debug('find: haeuser=%o', haeuser);
        return haeuser;
    }

    #checkKeys(keys: string[]) {
        let validKeys = true;
        keys.forEach((key) => {
            if (
                !this.#hausProps.includes(key) &&
                key !== 'waermepumpe' &&
                key !== 'pool' &&
                key !== 'strasse'
            ) {
                this.#logger.debug(
                    '#checkKeys: ungueltiges Suchkriterium "%s"',
                    key,
                );
                validKeys = false;
            }
        });

        return validKeys;
    }
}
