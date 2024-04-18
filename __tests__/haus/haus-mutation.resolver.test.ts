/* eslint-disable max-lines, @typescript-eslint/no-unsafe-assignment */

import { afterAll, beforeAll, describe, test } from '@jest/globals';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import {
    host,
    httpsAgent,
    port,
    shutdownServer,
    startServer,
} from '../testserver.js';
import { type GraphQLRequest } from '@apollo/server';
import { type GraphQLResponseBody } from './haus-query.resolver.test.js';
import { HttpStatus } from '@nestjs/common';
import { loginGraphQL } from '../login.js';

// eslint-disable-next-line jest/no-export
export type GraphQLQuery = Pick<GraphQLRequest, 'query'>;

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const idLoeschen = '60';

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
// eslint-disable-next-line max-lines-per-function
describe('GraphQL Mutations', () => {
    let client: AxiosInstance;
    const graphqlPath = 'graphql';

    // Testserver starten und dabei mit der DB verbinden
    beforeAll(async () => {
        await startServer();
        const baseURL = `https://${host}:${port}/`;
        client = axios.create({
            baseURL,
            httpsAgent,
        });
    });

    afterAll(async () => {
        await shutdownServer();
    });

    // -------------------------------------------------------------------------
    test('Neues Haus', async () => {
        // given
        const token = await loginGraphQL(client);
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const body: GraphQLQuery = {
            query: `
                mutation {
                    create(
                        input: {
                            hausflaeche: 450,
                            art: REIHENHAUS,
                            preis: 420000.00,
                            verkaeuflich: true,
                            baudatum: "2020-02-28",
                            katalog: "https://haus.de",
                            features: ["WAERMEPUMPE", "SMART-TV"],
                            adresse: {
                                strasse: "Turmstrasse",
                                hausnummer: 1,
                                plz: "84759"
                            },
                            personen: [{
                                vorname: "Marius",
                                nachname: "Müller",
                                eigentuemer: true
                            }]
                        }
                    ) {
                        id
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body, { headers: authorization });

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu); // eslint-disable-line sonarjs/no-duplicate-string
        expect(data.data).toBeDefined();

        const { create } = data.data!;

        // Der Wert der Mutation ist die generierte ID
        expect(create).toBeDefined();
        expect(create.id).toBeGreaterThan(0);
    });

    // -------------------------------------------------------------------------
    // eslint-disable-next-line max-lines-per-function
    test('Haus mit ungueltigen Werten neu anlegen', async () => {
        // given
        const token = await loginGraphQL(client);
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const body: GraphQLQuery = {
            query: `
                mutation {
                  create(
                    input: {
                        hausflaeche: -450,
                        art: BUNGALO,
                        preis: -420000.00,
                        verkaeuflich: "true",
                        baudatum: "2025-02-28",
                        katalog: "https://haus.de",
                        features: ["WAERMEPUMPE", "SMART-TV"],
                        adresse: {
                            strasse: "Turmstrasse",
                            hausnummer: 1,
                            plz: 84759
                        },
                        personen: [{
                            vorname: "Marius",
                            nachname: "Müller",
                            eigentuemer: true
                        }]
                    }
                ) {
                    id
                }
                }
            `,
        };
        const expectedMsg = [
            expect.stringMatching(/^hausflaeche /u),
            expect.stringMatching(/^art /u),
            expect.stringMatching(/^preis /u),
            expect.stringMatching(/^verkaeuflich /u),
            expect.stringMatching(/^baudatum /u),
            expect.stringMatching(/^adresse.plz /u),
        ];

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body, { headers: authorization });

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.create).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;

        expect(error).toBeDefined();

        const { message } = error;
        const messages: string[] = message.split(',');

        expect(messages).toBeDefined();
        expect(messages).toHaveLength(expectedMsg.length);
        expect(messages).toEqual(expect.arrayContaining(expectedMsg));
    });

    // -------------------------------------------------------------------------
    test('Haus aktualisieren', async () => {
        // given
        const token = await loginGraphQL(client);
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const body: GraphQLQuery = {
            query: `
                mutation {
                    update(
                        input: {
                            id: "40",
                            version: 0,
                            hausflaeche: 450,
                            art: BUNGALOW,
                            preis: 420000.00,
                            verkaeuflich: true,
                            baudatum: "2020-02-28",
                            katalog: "https://haus.de",
                            features: ["WAERMEPUMPE", "SMART-TV"],
                        }
                    ) {
                        version
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body, { headers: authorization });

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();

        const { update } = data.data!;

        // Der Wert der Mutation ist die neue Versionsnummer
        expect(update.version).toBe(1);
    });

    // -------------------------------------------------------------------------
    test('Haus mit ungueltigen Werten aktualisieren', async () => {
        // given
        const token = await loginGraphQL(client);
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const id = '40';
        const body: GraphQLQuery = {
            query: `
                mutation {
                    update(
                        input: {
                            id: "${id}",
                            version: 0,
                            hausflaeche: -450,
                            art: BUNGALO,
                            preis: -420000.00,
                            verkaeuflich: "true",
                            baudatum: "2025-02-28",
                            katalog: "https://haus.de",
                            features: ["WAERMEPUMPE", "SMART-TV"],
                        }
                    ) {
                        version
                    }
                }
            `,
        };
        const expectedMsg = [
            expect.stringMatching(/^hausflaeche /u),
            expect.stringMatching(/^art /u),
            expect.stringMatching(/^preis /u),
            expect.stringMatching(/^verkaeuflich /u),
            expect.stringMatching(/^baudatum /u),
        ];

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body, { headers: authorization });

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.update).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message } = error;
        const messages: string[] = message.split(',');

        expect(messages).toBeDefined();
        expect(messages).toHaveLength(expectedMsg.length);
        expect(messages).toEqual(expect.arrayContaining(expectedMsg));
    });

    // -------------------------------------------------------------------------
    test('Nicht-vorhandenes Haus aktualisieren', async () => {
        // given
        const token = await loginGraphQL(client);
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const id = '999999';
        const body: GraphQLQuery = {
            query: `
                mutation {
                    update(
                        input: {
                            id: "${id}",
                            version: 0,
                            hausflaeche: 450,
                            art: BUNGALOW,
                            preis: 420000.00,
                            verkaeuflich: true,
                            baudatum: "2020-02-28",
                            katalog: "https://haus.de",
                            features: ["WAERMEPUMPE", "SMART-TV"],
                        }
                    ) {
                        version
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body, { headers: authorization });

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.update).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;

        expect(error).toBeDefined();

        const { message, path, extensions } = error;

        expect(message).toBe(
            `Es gibt kein Haus mit der ID ${id.toLowerCase()}.`,
        );
        expect(path).toBeDefined();
        expect(path![0]).toBe('update');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    // -------------------------------------------------------------------------
    test('Haus loeschen', async () => {
        // given
        const token = await loginGraphQL(client);
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const body: GraphQLQuery = {
            query: `
                mutation {
                    delete(id: "${idLoeschen}")
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body, { headers: authorization });

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();

        const deleteMutation = data.data!.delete;

        // Der Wert der Mutation ist true (falls geloescht wurde) oder false
        expect(deleteMutation).toBe(true);
    });

    // -------------------------------------------------------------------------
    test('Haus loeschen als "user"', async () => {
        // given
        const token = await loginGraphQL(client, 'user', 'p');
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const body: GraphQLQuery = {
            query: `
                mutation {
                    delete(id: "60")
                }
            `,
        };

        // when
        const {
            status,
            headers,
            data,
        }: AxiosResponse<Record<'errors' | 'data', any>> = await client.post(
            graphqlPath,
            body,
            { headers: authorization },
        );

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);

        const { errors } = data;

        expect(errors[0].message).toBe('Forbidden resource');
        expect(errors[0].extensions.code).toBe('BAD_USER_INPUT');
        expect(data.data.delete).toBeNull();
    });
});
/* eslint-enable max-lines, @typescript-eslint/no-unsafe-assignment */
