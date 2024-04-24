/**
 * Das Modul besteht aus der Klasse {@linkcode QueryBuilder}.
 * @packageDocumentation
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { typeOrmModuleOptions } from '../../config/typeormOptions.js';
import { getLogger } from '../../logger/logger.js';
import { Adresse } from '../entity/adresse.entity.js';
import { Haus } from '../entity/haus.entity.js';
import { Person } from '../entity/person.entity.js';
import { type Suchkriterien } from './suchkriterien.js';

/** Typdefinitionen für die Suche mit der Haus-ID. */
export interface BuildIdParams {
    /** ID des gesuchten Hauses. */
    readonly id: number;
    /** Sollen die Personen mitgeladen werden? */
    readonly mitPersonen?: boolean;
}
/**
 * Die Klasse `QueryBuilder` implementiert das Lesen für Haeuser und greift
 * mit _TypeORM_ auf eine relationale DB zu.
 */
@Injectable()
export class QueryBuilder {
    readonly #hausAlias = `${Haus.name
        .charAt(0)
        .toLowerCase()}${Haus.name.slice(1)}`;

    readonly #adresseAlias = `${Adresse.name
        .charAt(0)
        .toLowerCase()}${Adresse.name.slice(1)}`;

    readonly #personAlias = `${Person.name
        .charAt(0)
        .toLowerCase()}${Person.name.slice(1)}`;

    readonly #repo: Repository<Haus>;

    readonly #logger = getLogger(QueryBuilder.name);

    constructor(@InjectRepository(Haus) repo: Repository<Haus>) {
        this.#repo = repo;
    }

    /**
     * Ein Haus mit der ID suchen.
     * @param id ID des gesuchten Hauses
     * @returns QueryBuilder
     */
    buildId({ id, mitPersonen = false }: BuildIdParams) {
        const queryBuilder = this.#repo.createQueryBuilder(this.#hausAlias);

        queryBuilder.innerJoinAndSelect(
            `${this.#hausAlias}.adresse`,
            this.#adresseAlias,
        );

        if (mitPersonen) {
            queryBuilder.leftJoinAndSelect(
                `${this.#hausAlias}.personen`,
                this.#personAlias,
            );
        }

        queryBuilder.where(`${this.#hausAlias}.id = :id`, { id: id }); // eslint-disable-line object-shorthand
        return queryBuilder;
    }

    /**
     * Haeuser asynchron suchen.
     * @param suchkriterien JSON-Objekt mit Suchkriterien
     * @returns QueryBuilder
     */
    // eslint-disable-next-line max-lines-per-function
    build({ strasse, waermepumpe, pool, ...props }: Suchkriterien) {
        this.#logger.debug(
            'build: strasse=%s, waermepumpe=%s, pool=%s, props=%o',
            strasse,
            waermepumpe,
            pool,
            props,
        );

        let queryBuilder = this.#repo.createQueryBuilder(this.#hausAlias);
        queryBuilder.innerJoinAndSelect(
            `${this.#hausAlias}.adresse`,
            'adresse',
        );

        let useWhere = true;

        if (strasse !== undefined && typeof strasse === 'string') {
            const ilike =
                typeOrmModuleOptions.type === 'postgres' ? 'ilike' : 'like';
            queryBuilder = queryBuilder.where(
                `${this.#adresseAlias}.strasse ${ilike} :strasse`,
                { strasse: `%${strasse}%` },
            );
            useWhere = false;
        }

        if (waermepumpe === 'true') {
            queryBuilder = useWhere
                ? queryBuilder.where(
                      `${this.#hausAlias}.features like '%WAERMEPUMPE%'`,
                  )
                : queryBuilder.andWhere(
                      `${this.#hausAlias}.features like '%WAERMEPUMPE%'`,
                  );
            useWhere = false;
        }

        if (pool === 'true') {
            queryBuilder = useWhere
                ? queryBuilder.where(
                      `${this.#hausAlias}.features like '%POOL%'`,
                  )
                : queryBuilder.andWhere(
                      `${this.#hausAlias}.features like '%POOL%'`,
                  );
            useWhere = false;
        }

        Object.keys(props).forEach((key) => {
            const param: Record<string, any> = {};
            param[key] = (props as Record<string, any>)[key]; // eslint-disable-line @typescript-eslint/no-unsafe-assignment, security/detect-object-injection
            queryBuilder = useWhere
                ? queryBuilder.where(
                      `${this.#hausAlias}.${key} = :${key}`,
                      param,
                  )
                : queryBuilder.andWhere(
                      `${this.#hausAlias}.${key} = :${key}`,
                      param,
                  );
            useWhere = false;
        });

        this.#logger.debug('build: sql=%s', queryBuilder.getSql());
        return queryBuilder;
    }
}
