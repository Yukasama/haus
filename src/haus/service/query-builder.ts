import { Person } from '../entity/person.entity.js';
import { Haus } from '../entity/haus.entity.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { type Suchkriterien } from './suchkriterien.js';
import { Adresse } from '../entity/adresse.entity.js';
import { getLogger } from '../../logger/logger.js';
import { typeOrmModuleOptions } from '../../config/typeormOptions.js';

export interface BuildIdParams {
    readonly id: number;

    readonly mitPersonen?: boolean;
}

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

        queryBuilder.where(`${this.#hausAlias}.id = :id`, { id: id });
        return queryBuilder;
    }

    build({ adresse, javascript, typescript, ...props }: Suchkriterien) {
        this.#logger.debug(
            'build: adresse=%s, javascript=%s, typescript=%s, props=%o',
            adresse,
            javascript,
            typescript,
            props,
        );

        let queryBuilder = this.#repo.createQueryBuilder(this.#hausAlias);
        queryBuilder.innerJoinAndSelect(
            `${this.#hausAlias}.adresse`,
            'adresse',
        );

        let useWhere = true;

        if (adresse !== undefined && typeof adresse === 'string') {
            const ilike =
                typeOrmModuleOptions.type === 'postgres' ? 'ilike' : 'like';
            queryBuilder = queryBuilder.where(
                `${this.#adresseAlias}.adresse ${ilike} :adresse`,
                { adresse: `%${adresse}%` },
            );
            useWhere = false;
        }

        if (javascript === 'true') {
            queryBuilder = useWhere
                ? queryBuilder.where(
                      `${this.#hausAlias}.features like '%JAVASCRIPT%'`,
                  )
                : queryBuilder.andWhere(
                      `${this.#hausAlias}.features like '%JAVASCRIPT%'`,
                  );
            useWhere = false;
        }

        if (typescript === 'true') {
            queryBuilder = useWhere
                ? queryBuilder.where(
                      `${this.#hausAlias}.features like '%TYPESCRIPT%'`,
                  )
                : queryBuilder.andWhere(
                      `${this.#hausAlias}.features like '%TYPESCRIPT%'`,
                  );
            useWhere = false;
        }

        Object.keys(props).forEach((key) => {
            const param: Record<string, any> = {};
            param[key] = (props as Record<string, any>)[key];
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
