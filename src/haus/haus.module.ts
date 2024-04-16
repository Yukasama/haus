import { HausGetController } from './rest/haus-get.controller.js';
import { HausMutationResolver } from './graphql/haus-mutation.resolver.js';
import { HausQueryResolver } from './graphql/haus-query.resolver.js';
import { HausReadService } from './service/haus-read.service.js';
import { HausWriteController } from './rest/haus-write.controller.js';
import { HausWriteService } from './service/haus-write.service.js';
import { KeycloakModule } from '../security/keycloak/keycloak.module.js';
import { Module } from '@nestjs/common';
import { QueryBuilder } from './service/query-builder.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { entities } from './entity/entities.js';

/**
 * Das Modul besteht aus Controller- und Service-Klassen für die Verwaltung von
 * Häusern.
 * @packageDocumentation
 */

/**
 * Die dekorierte Modul-Klasse mit Controller- und Service-Klassen sowie der
 * Funktionalität für TypeORM.
 */
@Module({
    imports: [KeycloakModule, TypeOrmModule.forFeature(entities)],
    controllers: [HausGetController, HausWriteController],
    providers: [
        HausReadService,
        HausWriteService,
        HausQueryResolver,
        HausMutationResolver,
        QueryBuilder,
    ],
    exports: [HausReadService, HausWriteService],
})
export class HausModule {}
