import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { BadUserInputError } from '../../haus/graphql/errors.js';
import { KeycloakService } from './keycloak.service.js';
import { Public } from 'nest-keycloak-connect';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { UseInterceptors } from '@nestjs/common';
import { getLogger } from '../../logger/logger.js';

/** Typdefinition für Login-Daten bei GraphQL */
export interface LoginInput {
    /** Benutzername */
    readonly username: string;
    /** Passwort */
    readonly password: string;
}

/** Typdefinition für Refresh-Daten bei GraphQL */
export interface RefreshInput {
    /** Refresh Token */
    readonly refresh_token: string; // eslint-disable-line @typescript-eslint/naming-convention
}

@Resolver('login')
@UseInterceptors(ResponseTimeInterceptor)
export class LoginResolver {
    readonly #keycloakService: KeycloakService;

    readonly #logger = getLogger(LoginResolver.name);

    constructor(keycloakService: KeycloakService) {
        this.#keycloakService = keycloakService;
    }

    @Mutation()
    @Public()
    async login(@Args() { username, password }: LoginInput) {
        this.#logger.debug('login: username=%s', username);

        const result = await this.#keycloakService.login({
            username,
            password,
        });
        if (result === undefined) {
            throw new BadUserInputError(
                'Falscher Benutzername oder falsches Passwort',
            );
        }

        this.#logger.debug('login: result=%o', result);
        return result;
    }

    @Mutation()
    @Public()
    async refresh(@Args() input: RefreshInput) {
        this.#logger.debug('refresh: input=%o', input);
        // eslint-disable-next-line camelcase, @typescript-eslint/naming-convention
        const { refresh_token } = input;

        const result = await this.#keycloakService.refresh(refresh_token);
        if (result === undefined) {
            throw new BadUserInputError('Falscher Token');
        }

        this.#logger.debug('refresh: result=%o', result);
        return result;
    }
}
