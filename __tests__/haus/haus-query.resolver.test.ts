// @eslint-community/eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { type Haus, type HausArt } from '../../src/haus/entity/haus.entity.js';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import {
    host,
    httpsAgent,
    port,
    shutdownServer,
    startServer,
} from '../testserver.js';
import { type GraphQLFormattedError } from 'graphql';
import { type GraphQLRequest } from '@apollo/server';
import { HttpStatus } from '@nestjs/common';

// eslint-disable-next-line jest/no-export
export interface GraphQLResponseBody {
    data?: Record<string, any> | null;
    errors?: readonly [GraphQLFormattedError];
}

type HausDTO = Omit<Haus, 'personen' | 'aktualisiert' | 'erzeugt'>;

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const idVorhanden = '1';

const strasseVorhanden = 'Moltkestrasse';
const teilStrasseVorhanden = 'a';
const teilStrasseNichtVorhanden = 'abc';

// const isbnVorhanden = '978-3-897-22583-1';

const preisVorhanden = 350_000;
const preisNichtVorhanden = 123_456;

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
// eslint-disable-next-line max-lines-per-function
describe('GraphQL Queries', () => {
    let client: AxiosInstance;
    const graphqlPath = 'graphql';

    // Testserver starten und dabei mit der DB verbinden
    beforeAll(async () => {
        await startServer();
        const baseURL = `https://${host}:${port}/`;
        client = axios.create({
            baseURL,
            httpsAgent,
            // auch Statuscode 400 als gueltigen Request akzeptieren, wenn z.B.
            // ein Enum mit einem falschen String getestest wird
            validateStatus: () => true,
        });
    });

    afterAll(async () => {
        await shutdownServer();
    });

    test('Haus zu vorhandener ID', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    haus(id: "${idVorhanden}") {
                        version
                        hausflaeche
                        art
                        preis
                        verkaeuflich
                        baudatum
                        katalog
                        features
                        adresse {
                            strasse
                        },
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu); // eslint-disable-line sonarjs/no-duplicate-string
        expect(data.errors).toBeUndefined();
        expect(data.data).toBeDefined();

        const { haus } = data.data!;
        const result: HausDTO = haus;

        expect(result.adresse?.strasse).toMatch(/^\w/u);
        expect(result.version).toBeGreaterThan(-1);
        expect(result.id).toBeUndefined();
    });

    test('Haus zu nicht-vorhandener ID', async () => {
        // given
        const id = '999999';
        const body: GraphQLRequest = {
            query: `
                {
                    haus(id: "${id}") {
                        adresse {
                            strasse
                        }
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.haus).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message, path, extensions } = error;

        expect(message).toBe(`Es gibt kein Haus mit der ID ${id}.`);
        expect(path).toBeDefined();
        expect(path![0]).toBe('haus');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    test('Haus zu vorhandener Strasse', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    haeuser(suchkriterien: {
                        strasse: "${strasseVorhanden}"
                    }) {
                        art
                        adresse {
                            strasse
                        }
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();

        expect(data.data).toBeDefined();

        const { haeuser } = data.data!;

        expect(haeuser).not.toHaveLength(0);

        const haeuserArray: HausDTO[] = haeuser;

        expect(haeuserArray).toHaveLength(1);

        const [haus] = haeuserArray;

        expect(haus!.adresse?.strasse).toBe(strasseVorhanden);
    });

    test('Haus zu vorhandener Teil-Strasse', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    haeuser(suchkriterien: {
                        strasse: "${teilStrasseVorhanden}"
                    }) {
                        adresse {
                            strasse
                        }
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();
        expect(data.data).toBeDefined();

        const { haeuser } = data.data!;

        expect(haeuser).not.toHaveLength(0);

        const haeuserArray: HausDTO[] = haeuser;
        haeuserArray
            .map((haus) => haus.adresse)
            .forEach((adresse) =>
                expect(adresse?.strasse.toLowerCase()).toEqual(
                    expect.stringContaining(teilStrasseVorhanden),
                ),
            );
    });

    test('Haus zu nicht vorhandener Strasse', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    haeuser(suchkriterien: {
                        strasse: "${teilStrasseNichtVorhanden}"
                    }) {
                        art
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.haeuser).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message, path, extensions } = error;

        expect(message).toMatch(/^Keine Haeuser gefunden:/u);
        expect(path).toBeDefined();
        expect(path![0]).toBe('haeuser');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    // TODO
    // test('Haus zu vorhandener ISBN-Nummer', async () => {
    //     // given
    //     const body: GraphQLRequest = {
    //         query: `
    //             {
    //                 haeuser(suchkriterien: {
    //                     isbn: "${isbnVorhanden}"
    //                 }) {
    //                     isbn
    //                     titel {
    //                         titel
    //                     }
    //                 }
    //             }
    //         `,
    //     };

    //     // when
    //     const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
    //         await client.post(graphqlPath, body);

    //     // then
    //     expect(status).toBe(HttpStatus.OK);
    //     expect(headers['content-type']).toMatch(/json/iu);
    //     expect(data.errors).toBeUndefined();

    //     expect(data.data).toBeDefined();

    //     const { haeuser } = data.data!;

    //     expect(haeuser).not.toHaveLength(0);

    //     const haeuserArray: HausDTO[] = haeuser;

    //     expect(haeuserArray).toHaveLength(1);

    //     const [haus] = haeuserArray;
    //     const { isbn, titel } = haus!;

    //     expect(isbn).toBe(isbnVorhanden);
    //     expect(titel?.titel).toBeDefined();
    // });

    test('Haeuser zu vorhandenem "preis"', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    haeuser(suchkriterien: {
                        preis: ${preisVorhanden},
                        strasse: "${teilStrasseVorhanden}"
                    }) {
                        preis
                        adresse {
                            strasse
                        }
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();

        expect(data.data).toBeDefined();

        const { haeuser } = data.data!;

        expect(haeuser).not.toHaveLength(0);

        const haeuserArray: HausDTO[] = haeuser;

        haeuserArray.forEach((haus) => {
            const { preis, adresse } = haus;

            expect(preis).toBe(preisVorhanden);
            expect(adresse?.strasse.toLowerCase()).toEqual(
                expect.stringContaining(teilStrasseVorhanden),
            );
        });
    });

    test('Kein Haus zu nicht-vorhandenem "preis"', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    haeuser(suchkriterien: {
                        preis: ${preisNichtVorhanden}
                    }) {
                        adresse {
                            strasse
                        }
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.haeuser).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message, path, extensions } = error;

        expect(message).toMatch(/^Keine Haeuser gefunden:/u);
        expect(path).toBeDefined();
        expect(path![0]).toBe('haeuser');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    test('Haeuser zur Art "REIHENHAUS"', async () => {
        // given
        const hausArt: HausArt = 'REIHENHAUS';
        const body: GraphQLRequest = {
            query: `
                {
                    haeuser(suchkriterien: {
                        art: ${hausArt}
                    }) {
                        art
                        adresse {
                            strasse
                        }
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();

        expect(data.data).toBeDefined();

        const { haeuser } = data.data!;

        expect(haeuser).not.toHaveLength(0);

        const haeuserArray: HausDTO[] = haeuser;

        haeuserArray.forEach((haus) => {
            const { art, adresse } = haus;

            expect(art).toBe(hausArt);
            expect(adresse?.strasse).toBeDefined();
        });
    });

    test('Haeuser zur einer ungueltigen Art', async () => {
        // given
        const hausArt = 'UNGUELTIG';
        const body: GraphQLRequest = {
            query: `
                {
                    haeuser(suchkriterien: {
                        art: ${hausArt}
                    }) {
                        adresse {
                            strasse
                        }
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.BAD_REQUEST);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data).toBeUndefined();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { extensions } = error;

        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('GRAPHQL_VALIDATION_FAILED');
    });

    test('Haeuser mit verkaeuflich=true', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    haeuser(suchkriterien: {
                        verkaeuflich: true
                    }) {
                        verkaeuflich
                        adresse {
                            strasse
                        }
                    }
                }
            `,
        };

        // when
        const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
            await client.post(graphqlPath, body);

        // then
        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();

        expect(data.data).toBeDefined();

        const { haeuser } = data.data!;

        expect(haeuser).not.toHaveLength(0);

        const haeuserArray: HausDTO[] = haeuser;

        haeuserArray.forEach((haus) => {
            const { verkaeuflich, adresse } = haus;

            expect(verkaeuflich).toBe(true);
            expect(adresse?.strasse).toBeDefined();
        });
    });
});

/* eslint-enable @typescript-eslint/no-unsafe-assignment */
/* eslint-enable max-lines */
