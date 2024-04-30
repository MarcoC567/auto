import { afterAll, beforeAll, describe, test } from '@jest/globals';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import {
    host,
    httpsAgent,
    port,
    shutdownServer,
    startServer,
} from '../testserver.js';
import { type AutoDtoOhneRef } from '../../src/auto/rest/autoDTO.entity.js';
import { type ErrorResponse } from './error-response.js';
import { HttpStatus } from '@nestjs/common';
import { loginRest } from '../login.js';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const geaendertesAuto: AutoDtoOhneRef = {
    fahrgestellnummer: '12345',
    art: 'SUV',
    preis: 25_000,
    lieferbar: true,
    datum: '2024-03-20',
};
const idVorhanden = '30';

const geaendertesAutoIdNichtVorhanden: AutoDtoOhneRef = {
    fahrgestellnummer: '456321',
    art: 'SUV',
    preis: 9999,
    lieferbar: true,
    datum: '2024-01-01',
};
const idNichtVorhanden = '999999';

const geaendertesAutoInvalid: Record<string, unknown> = {
    fahrgestellnummer: 'falsche-Nummer',
    art: 'COUPE',
    preis: -1,
    lieferbar: true,
    datum: '12345-123-123',
    bezeichnung: '?!',
};

const veraltesAuto: AutoDtoOhneRef = {
    fahrgestellnummer: '9876',
    art: 'SUV',
    preis: 10_000,
    lieferbar: true,
    datum: '2024-02-04',
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
        const token = await loginRest(client);
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
        const token = await loginRest(client);
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
        const token = await loginRest(client);
        headers.Authorization = `Bearer ${token}`;
        headers['If-Match'] = '"0"';
        const expectedMsg = [
            expect.stringMatching(/^fahrgestellnummer /u),
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
        const token = await loginRest(client);
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
        const token = await loginRest(client);
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
