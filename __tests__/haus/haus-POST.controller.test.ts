/*
 * Copyright (C) 2016 - present Juergen Zimmermann, Hochschule Karlsruhe
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { afterAll, beforeAll, describe, test } from '@jest/globals';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import {
    host,
    httpsAgent,
    port,
    shutdownServer,
    startServer,
} from '../testserver.js';
// import { type ErrorResponse } from './error-response.js';
import { type HausDTO } from '../../src/haus/rest/hausDTO.entity.js';
import { HausReadService } from '../../src/haus/service/haus-read.service.js';
import { HttpStatus } from '@nestjs/common';
import { loginRest } from '../login.js';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const neuesHaus: HausDTO = {
    hausflaeche: 600,
    art: 'REIHENHAUS',
    preis: 2500,
    verkaeuflich: true,
    baudatum: '2021-02-28',
    katalog: 'https://haus.rest',
    features: ['WAERMEPUMPE'],
    adresse: {
        strasse: 'Strasse',
        hausnummer: '1',
        plz: '76133',
    },
    personen: [
        {
            vorname: 'Chris',
            nachname: 'Konrad',
            eigentuemer: true,
        },
    ],
};
const neuesHausInvalid: Record<string, unknown> = {
    hausflaeche: 600,
    art: 'REIHENHAU',
    preis: -2500,
    verkaeuflich: 'true',
    baudatum: '2022-02-28',
    katalog: 'https://post.rest',
    features: ['WAERMEPUMPE'],
    adresse: {
        strasse: 1,
        hausnummer: '1',
        plz: '76138',
    },
};
// const neuesHausIsbnExistiert: HausDTO = {
//     hausflaeche: -600,
//     art: 'REIHENHAUS',
//     preis: -2500,
//     verkaeuflich: true,
//     baudatum: '2022-02-28',
//     katalog: 'https://post.rest',
//     features: ['WAERMEPUMPE'],
//     adresse: {
//         strasse: 'Strasse',
//         hausnummer: '1',
//         plz: '76133',
//     },
//     personen: undefined,
// };

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
// eslint-disable-next-line max-lines-per-function
describe('POST /rest', () => {
    let client: AxiosInstance;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json', // eslint-disable-line @typescript-eslint/naming-convention
    };

    // Testserver starten und dabei mit der DB verbinden
    beforeAll(async () => {
        await startServer();
        const baseURL = `https://${host}:${port}`;
        client = axios.create({
            baseURL,
            httpsAgent,
            validateStatus: (status) => status < 500, // eslint-disable-line @typescript-eslint/no-magic-numbers
        });
    });

    afterAll(async () => {
        await shutdownServer();
    });

    test('Neues Haus', async () => {
        // given
        const token = await loginRest(client);
        headers.Authorization = `Bearer ${token}`;

        // when
        const response: AxiosResponse<string> = await client.post(
            '/rest',
            neuesHaus,
            { headers },
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.CREATED);

        const { location } = response.headers as { location: string };

        expect(location).toBeDefined();

        // ID nach dem letzten "/"
        const indexLastSlash: number = location.lastIndexOf('/');

        expect(indexLastSlash).not.toBe(-1);

        const idStr = location.slice(indexLastSlash + 1);

        expect(idStr).toBeDefined();
        expect(HausReadService.ID_PATTERN.test(idStr)).toBe(true);

        expect(data).toBe('');
    });

    test('Neues Haus mit ungueltigen Daten', async () => {
        // given
        const token = await loginRest(client);
        headers.Authorization = `Bearer ${token}`;
        const expectedMsg = [
            expect.stringMatching(/^art /u),
            expect.stringMatching(/^preis /u),
            expect.stringMatching(/^verkaeuflich /u),
            expect.stringMatching(/^adresse.strasse /u),
            expect.stringMatching(/^adresse.strasse /u),
        ];

        // when
        const response: AxiosResponse<Record<string, any>> = await client.post(
            '/rest',
            neuesHausInvalid,
            { headers },
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const messages: string[] = data.message;

        expect(messages).toBeDefined();
        expect(messages).toHaveLength(expectedMsg.length);
        expect(messages).toEqual(expect.arrayContaining(expectedMsg));
    });

    // TODO
    // test('Neues Haus, aber die ISBN existiert bereits', async () => {
    //     // given
    //     const token = await loginRest(client);
    //     headers.Authorization = `Bearer ${token}`;

    //     // when
    //     const response: AxiosResponse<ErrorResponse> = await client.post(
    //         '/rest',
    //         neuesHausIsbnExistiert,
    //         { headers },
    //     );

    //     // then
    //     const { data } = response;

    //     const { message, statusCode } = data;

    //     expect(message).toEqual(expect.stringContaining('ISBN'));
    //     expect(statusCode).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    // });

    test('Neues Haus, aber ohne Token', async () => {
        // when
        const response: AxiosResponse<Record<string, any>> = await client.post(
            '/rest',
            neuesHaus,
        );

        // then
        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    test('Neues Haus, aber mit falschem Token', async () => {
        // given
        const token = 'FALSCH';
        headers.Authorization = `Bearer ${token}`;

        // when
        const response: AxiosResponse<Record<string, any>> = await client.post(
            '/rest',
            neuesHaus,
            { headers },
        );

        // then
        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    test.todo('Abgelaufener Token');
});
