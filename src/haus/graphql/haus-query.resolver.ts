import { Args, Query, Resolver } from '@nestjs/graphql';
import { UseFilters, UseInterceptors } from '@nestjs/common';
import { Haus } from '../entity/haus.entity.js';
import { Suchkriterien } from './suchkriterien';
import { HausReadService } from '../service/haus-read.service.js';
import { HttpExceptionFilter } from './http-exception.filter.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { Public } from 'nest-keycloak-connect';
import { getLogger } from '../../logger/logger.js';

export interface IdInput {
    readonly id: number;
}

export interface SuchkriterienInput {
    readonly suchkriterien: Suchkriterien;
}

@Resolver((_: any) => Haus)
@UseFilters(HttpExceptionFilter)
@UseInterceptors(ResponseTimeInterceptor)
export class HausQueryResolver {
    readonly #service: HausReadService;
    readonly #logger = getLogger(HausQueryResolver.name);

    constructor(service: HausReadService) {
        this.#service = service;
    }

    @Query('haus')
    @Public()
    async findById(@Args('id') id: IdInput) {
        this.#logger.debug('findById(%o)', id);

        const haus = await this.#service.findById(id);

        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug('findById(%o) = %o', haus.toString());
        }

        return haus;
    }

    @Query('haeuser')
    @Public()
    async find(@Args() input: SuchkriterienInput | undefined) {
        this.#logger.debug('find: input=%o', input);

        const haeuser = await this.#service.find(input?.suchkriterien);

        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug('find(%o) = %o', haeuser);
        }

        return haeuser;
    }
}
