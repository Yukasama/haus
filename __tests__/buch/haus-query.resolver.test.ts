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

type HausDTO = Omit<
    Haus,
    'abbildungen' | 'aktualisiert' | 'erzeugt' | 'rabatt'
> & {
    rabatt: string;
};

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const idVorhanden = '1';

const titelVorhanden = 'Alpha';
const teilTitelVorhanden = 'a';
const teilTitelNichtVorhanden = 'abc';

const isbnVorhanden = '978-3-897-22583-1';

const ratingVorhanden = 2;
const ratingNichtVorhanden = 99;

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
                        isbn
                        rating
                        art
                        preis
                        lieferbar
                        datum
                        homepage
                        schlagwoerter
                        titel {
                            titel
                        }
                        rabatt(short: true)
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

        expect(result.titel?.titel).toMatch(/^\w/u);
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
                        titel {
                            titel
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

    test('Haus zu vorhandenem Titel', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    buecher(suchkriterien: {
                        titel: "${titelVorhanden}"
                    }) {
                        art
                        titel {
                            titel
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

        const { buecher } = data.data!;

        expect(buecher).not.toHaveLength(0);

        const buecherArray: HausDTO[] = buecher;

        expect(buecherArray).toHaveLength(1);

        const [haus] = buecherArray;

        expect(haus!.titel?.titel).toBe(titelVorhanden);
    });

    test('Haus zu vorhandenem Teil-Titel', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    buecher(suchkriterien: {
                        titel: "${teilTitelVorhanden}"
                    }) {
                        titel {
                            titel
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

        const { buecher } = data.data!;

        expect(buecher).not.toHaveLength(0);

        const buecherArray: HausDTO[] = buecher;
        buecherArray
            .map((haus) => haus.titel)
            .forEach((titel) =>
                expect(titel?.titel.toLowerCase()).toEqual(
                    expect.stringContaining(teilTitelVorhanden),
                ),
            );
    });

    test('Haus zu nicht vorhandenem Titel', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    buecher(suchkriterien: {
                        titel: "${teilTitelNichtVorhanden}"
                    }) {
                        art
                        titel {
                            titel
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
        expect(data.data!.buecher).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message, path, extensions } = error;

        expect(message).toMatch(/^Keine Haeuser gefunden:/u);
        expect(path).toBeDefined();
        expect(path![0]).toBe('buecher');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    test('Haus zu vorhandener ISBN-Nummer', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    buecher(suchkriterien: {
                        isbn: "${isbnVorhanden}"
                    }) {
                        isbn
                        titel {
                            titel
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

        const { buecher } = data.data!;

        expect(buecher).not.toHaveLength(0);

        const buecherArray: HausDTO[] = buecher;

        expect(buecherArray).toHaveLength(1);

        const [haus] = buecherArray;
        const { isbn, titel } = haus!;

        expect(isbn).toBe(isbnVorhanden);
        expect(titel?.titel).toBeDefined();
    });

    test('Haeuser zu vorhandenem "rating"', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    buecher(suchkriterien: {
                        rating: ${ratingVorhanden},
                        titel: "${teilTitelVorhanden}"
                    }) {
                        rating
                        titel {
                            titel
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

        const { buecher } = data.data!;

        expect(buecher).not.toHaveLength(0);

        const buecherArray: HausDTO[] = buecher;

        buecherArray.forEach((haus) => {
            const { rating, titel } = haus;

            expect(rating).toBe(ratingVorhanden);
            expect(titel?.titel.toLowerCase()).toEqual(
                expect.stringContaining(teilTitelVorhanden),
            );
        });
    });

    test('Kein Haus zu nicht-vorhandenem "rating"', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    buecher(suchkriterien: {
                        rating: ${ratingNichtVorhanden}
                    }) {
                        titel {
                            titel
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
        expect(data.data!.buecher).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message, path, extensions } = error;

        expect(message).toMatch(/^Keine Haeuser gefunden:/u);
        expect(path).toBeDefined();
        expect(path![0]).toBe('buecher');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    test('Haeuser zur Art "KINDLE"', async () => {
        // given
        const hausArt: HausArt = 'KINDLE';
        const body: GraphQLRequest = {
            query: `
                {
                    buecher(suchkriterien: {
                        art: ${hausArt}
                    }) {
                        art
                        titel {
                            titel
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

        const { buecher } = data.data!;

        expect(buecher).not.toHaveLength(0);

        const buecherArray: HausDTO[] = buecher;

        buecherArray.forEach((haus) => {
            const { art, titel } = haus;

            expect(art).toBe(hausArt);
            expect(titel?.titel).toBeDefined();
        });
    });

    test('Haeuser zur einer ungueltigen Art', async () => {
        // given
        const hausArt = 'UNGUELTIG';
        const body: GraphQLRequest = {
            query: `
                {
                    buecher(suchkriterien: {
                        art: ${hausArt}
                    }) {
                        titel {
                            titel
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

    test('Haeuser mit lieferbar=true', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    buecher(suchkriterien: {
                        lieferbar: true
                    }) {
                        lieferbar
                        titel {
                            titel
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

        const { buecher } = data.data!;

        expect(buecher).not.toHaveLength(0);

        const buecherArray: HausDTO[] = buecher;

        buecherArray.forEach((haus) => {
            const { lieferbar, titel } = haus;

            expect(lieferbar).toBe(true);
            expect(titel?.titel).toBeDefined();
        });
    });
});

/* eslint-enable @typescript-eslint/no-unsafe-assignment */
/* eslint-enable max-lines */
