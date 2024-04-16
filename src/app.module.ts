import {
    type MiddlewareConsumer,
    Module,
    type NestModule,
} from '@nestjs/common';
import { AdminModule } from './admin/admin.module.js';
import { type ApolloDriverConfig } from '@nestjs/apollo';
import { HausGetController } from './haus/rest/haus-get.controller.js';
import { HausModule } from './haus/haus.module.js';
import { HausWriteController } from './haus/rest/haus-write.controller.js';
import { DevModule } from './config/dev/dev.module.js';
import { GraphQLModule } from '@nestjs/graphql';
import { KeycloakModule } from './security/keycloak/keycloak.module.js';
import { LoggerModule } from './logger/logger.module.js';
import { RequestLoggerMiddleware } from './logger/request-logger.middleware.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { graphQlModuleOptions } from './config/graphql.js';
import { typeOrmModuleOptions } from './config/typeormOptions.js';

@Module({
    imports: [
        AdminModule,
        HausModule,
        DevModule,
        GraphQLModule.forRoot<ApolloDriverConfig>(graphQlModuleOptions),
        LoggerModule,
        KeycloakModule,
        TypeOrmModule.forRoot(typeOrmModuleOptions),
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(RequestLoggerMiddleware)
            .forRoutes(
                HausGetController,
                HausWriteController,
                'auth',
                'graphql',
            );
    }
}
