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
import { type AutoDtoOhneRef } from '../../src/auto/controller/autoDTO.entity.js';
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
const geaendertesAuto: AutoDtoOhneRef = {
    fahrgestellnummer: '978-0-201-63361-0',
    art: 'SUV',
    preis: 3333,
    lieferbar: true,
    datum: '2022-03-03',
};
const idVorhanden = '30';

const geaendertesAutoIdNichtVorhanden: AutoDtoOhneRef = {
    fahrgestellnummer: '978-0-007-09732-6',
    art: 'LIMOUSINE',
    preis: 44.4,
    lieferbar: true,
    datum: '2022-02-04',
};
const idNichtVorhanden = '999999';

const geaendertesAutoInvalid: Record<string, unknown> = {
    fahrgestellnummer: 'HAKFNASLGJ348456',
    art: 'FALSCH',
    preis: -44.4,
    lieferbar: true,
    datum: '2022-02-05f',
    bezeichnung: '?!',
};

const veraltesAuto: AutoDtoOhneRef = {
    fahrgestellnummer: 'HKASGHIPH346345TE',
    art: 'LIMOUSINE',
    preis: 44.4,
    lieferbar: true,
    datum: '2022-02-04',
};

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
// eslint-disable-next-line max-lines-per-function
describe('PUT /rest/:id', () => {
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
            headers,
            httpsAgent,
            validateStatus: (status) => status < 500, // eslint-disable-line @typescript-eslint/no-magic-numbers
        });
    });

    afterAll(async () => {
        await shutdownServer();
    });

    test('Vorhandenes Auto aendern', async () => {
        // given
        const url = `/rest/${idVorhanden}`;
        const token = await tokenRest(client);
        headers.Authorization = `Bearer ${token}`;
        headers['If-Match'] = '"0"';

        // when
        const { status, data }: AxiosResponse<string> = await client.put(
            url,
            geaendertesAuto,
            { headers },
        );

        // then
        expect(status).toBe(HttpStatus.NO_CONTENT);
        expect(data).toBe('');
    });

    test('Nicht-vorhandenes Auto aendern', async () => {
        // given
        const url = `/rest/${idNichtVorhanden}`;
        const token = await tokenRest(client);
        headers.Authorization = `Bearer ${token}`;
        headers['If-Match'] = '"0"';

        // when
        const { status }: AxiosResponse<string> = await client.put(
            url,
            geaendertesAutoIdNichtVorhanden,
            { headers },
        );

        // then
        expect(status).toBe(HttpStatus.NOT_FOUND);
    });

    test('Vorhandenes Auto aendern, aber mit ungueltigen Daten', async () => {
        // given
        const url = `/rest/${idVorhanden}`;
        const token = await tokenRest(client);
        headers.Authorization = `Bearer ${token}`;
        headers['If-Match'] = '"0"';
        const expectedMsg = [
            expect.stringMatching(/^art /u),
            expect.stringMatching(/^preis /u),
            expect.stringMatching(/^datum /u),
        ];

        // when
        const { status, data }: AxiosResponse<Record<string, any>> =
            await client.put(url, geaendertesAutoInvalid, { headers });

        // then
        expect(status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const messages: string[] = data.message;

        expect(messages).toBeDefined();
        expect(messages).toHaveLength(expectedMsg.length);
        expect(messages).toEqual(expect.arrayContaining(expectedMsg));
    });

    test('Vorhandenes Auto aendern, aber ohne Versionsnummer', async () => {
        // given
        const url = `/rest/${idVorhanden}`;
        const token = await tokenRest(client);
        headers.Authorization = `Bearer ${token}`;
        delete headers['If-Match'];

        // when
        const { status, data }: AxiosResponse<string> = await client.put(
            url,
            geaendertesAuto,
            { headers },
        );

        // then
        expect(status).toBe(HttpStatus.PRECONDITION_REQUIRED);
        expect(data).toBe('Header "If-Match" fehlt');
    });

    test('Vorhandenes Auto aendern, aber mit alter Versionsnummer', async () => {
        // given
        const url = `/rest/${idVorhanden}`;
        const token = await tokenRest(client);
        headers.Authorization = `Bearer ${token}`;
        headers['If-Match'] = '"-1"';

        // when
        const { status, data }: AxiosResponse<ErrorResponse> = await client.put(
            url,
            veraltesAuto,
            { headers },
        );

        // then
        expect(status).toBe(HttpStatus.PRECONDITION_FAILED);

        const { message, statusCode } = data;

        expect(message).toMatch(/Versionsnummer/u);
        expect(statusCode).toBe(HttpStatus.PRECONDITION_FAILED);
    });

    test('Vorhandenes Auto aendern, aber ohne Token', async () => {
        // given
        const url = `/rest/${idVorhanden}`;
        delete headers.Authorization;
        headers['If-Match'] = '"0"';

        // when
        const response: AxiosResponse<Record<string, any>> = await client.put(
            url,
            geaendertesAuto,
            { headers },
        );

        // then
        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    test('Vorhandenes Auto aendern, aber mit falschem Token', async () => {
        // given
        const url = `/rest/${idVorhanden}`;
        const token = 'FALSCH';
        headers.Authorization = `Bearer ${token}`;

        // when
        const response: AxiosResponse<Record<string, any>> = await client.put(
            url,
            geaendertesAuto,
            { headers },
        );

        // then
        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });
});
