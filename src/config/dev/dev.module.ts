import { Haus } from '../../haus/entity/haus.entity.js';
import { DbPopulateService } from './db-populate.service.js';
import { DevController } from './dev.controller.js';
import { KeycloakModule } from '../../security/keycloak/keycloak.module.js';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
    imports: [KeycloakModule, TypeOrmModule.forFeature([Haus])],
    controllers: [DevController],
    providers: [DbPopulateService],
    exports: [DbPopulateService],
})
export class DevModule {}
