// Copyright (C) 2016 - present Juergen Zimmermann, Hochschule Karlsruhe
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { HttpStatus } from '@nestjs/common';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { type AutoDTO } from '../../src/auto/controller/autoDTO.entity.js';
import { AutoReadService } from '../../src/auto/service/auto-read.service.js';
import {
    host,
    httpsAgent,
    port,
    shutdownServer,
    startServer,
} from '../testserver.js';
import { tokenRest } from '../token.js';
import { type ErrorResponse } from './error-response.js';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const neuesAuto: AutoDTO = {
    fahrgestellnummer: 'WKN352362I3F555',
    art: 'SUV',
    preis: 2000,
    lieferbar: true,
    datum: '2022-02-28',
    bezeichnung: {
        bezeichnung: 'Titelpost',
        zusatz: 'untertitelpos',
    },
    zubehoere: [
        {
            name: 'Abb. 1',
            beschreibung: 'img/png',
        },
    ],
};
const neuesAutoInvalid: Record<string, unknown> = {
    fahrgestellnummer: 'WKN352362I3F555',
    art: 'FALSCH',
    preis: -2000,
    lieferbar: true,
    datum: '2022-02-28f',
    bezeichnung: {
        bezeichnung: 'Titelpost',
        zusatz: 'untertitelpos',
    },
};
const neuesAutoFahrgestellnummerExistiert: AutoDTO = {
    fahrgestellnummer: 'WKN352362I3F555',
    art: 'SUV',
    preis: 2000,
    lieferbar: true,
    datum: '2022-02-28',
    bezeichnung: {
        bezeichnung: 'Titelpost',
        zusatz: 'untertitelpos',
    },
    zubehoere: undefined,
};

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

    test('Neues Auto', async () => {
        // given
        const token = await tokenRest(client);
        headers.Authorization = `Bearer ${token}`;

        // when
        const response: AxiosResponse<string> = await client.post(
            '/rest',
            neuesAuto,
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
        expect(AutoReadService.ID_PATTERN.test(idStr)).toBe(true);

        expect(data).toBe('');
    });

    test('Neues Auto mit ungueltigen Daten', async () => {
        // given
        const token = await tokenRest(client);
        headers.Authorization = `Bearer ${token}`;
        const expectedMsg = [
            expect.stringMatching(/^art /u),
            expect.stringMatching(/^preis /u),
            expect.stringMatching(/^datum /u),
        ];

        // when
        const response: AxiosResponse<Record<string, any>> = await client.post(
            '/rest',
            neuesAutoInvalid,
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

    test('Neues Auto, aber die Fahrgestellnummer existiert bereits', async () => {
        // given
        const token = await tokenRest(client);
        headers.Authorization = `Bearer ${token}`;

        // when
        const response: AxiosResponse<ErrorResponse> = await client.post(
            '/rest',
            neuesAutoFahrgestellnummerExistiert,
            { headers },
        );

        // then
        const { data } = response;

        const { message, statusCode } = data;

        expect(message).toEqual(expect.stringContaining('fahrgestellnummer'));
        expect(statusCode).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    });

    test('Neues Auto, aber ohne Token', async () => {
        // when
        const response: AxiosResponse<Record<string, any>> = await client.post(
            '/rest',
            neuesAuto,
        );

        // then
        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    test('Neues Auto, aber mit falschem Token', async () => {
        // given
        const token = 'FALSCH';
        headers.Authorization = `Bearer ${token}`;

        // when
        const response: AxiosResponse<Record<string, any>> = await client.post(
            '/rest',
            neuesAuto,
            { headers },
        );

        // then
        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    test.todo('Abgelaufener Token');
});
