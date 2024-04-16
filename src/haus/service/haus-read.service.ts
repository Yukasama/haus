import { Injectable, NotFoundException } from '@nestjs/common';
import { Haus } from './../entity/haus.entity.js';
import { QueryBuilder } from './query-builder.js';
import { type Suchkriterien } from './suchkriterien.js';
import { getLogger } from '../../logger/logger.js';

export interface FindByIdParams {

    readonly id: number;

    readonly mitPersonen?: boolean;
}

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
                this.#logger.debug(
                    'findById: Personen=%o',
                    haus.personen,
                );
            }
        }
        return haus;
    }

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
                key !== 'javascript' &&
                key !== 'typescript'
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
