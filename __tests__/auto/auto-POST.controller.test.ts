import { afterAll, beforeAll, describe, test } from '@jest/globals';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import {
    host,
    httpsAgent,
    port,
    shutdownServer,
    startServer,
} from '../testserver.js';
import { type AutoDTO } from '../../src/auto/rest/autoDTO.entity.js';
import { AutoReadService } from '../../src/auto/service/auto-read.service.js';
import { type ErrorResponse } from './error-response.js';
import { HttpStatus } from '@nestjs/common';
import { loginRest } from '../login.js';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const neuesAuto: AutoDTO = {
    fahrgestellnummer: '12345',
    art: 'SUV',
    preis: 99.99,
    lieferbar: true,
    datum: '2024-02-28',
    bezeichnung: {
        bezeichnung: 'Turbo',
        zusatz: 'V1',
    },
    zubehoere: [
        {
            name: 'XCV',
            beschreibung: '360 Grad Rückfahrkamera',
        },
    ],
};
const neuesAutoInvalid: Record<string, unknown> = {
    fahrgestellnummer: 'falsche-Nummer',
    art: 'COUPE',
    preis: -1,
    lieferbar: true,
    datum: '12345-123-123',
    bezeichnung: {
        bezeichnung: '?!',
        zusatz: 'Zusatzinvalid',
    },
};
const neuesAutoFahrgestellnummerExistiert: AutoDTO = {
    fahrgestellnummer: '12345',
    art: 'SUV',
    preis: 35_000,
    lieferbar: true,
    datum: '2024-04-28',
    bezeichnung: {
        bezeichnung: 'Titelpostisbn',
        zusatz: 'Zusatzpostisbn',
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
        const token = await loginRest(client);
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
        const token = await loginRest(client);
        headers.Authorization = `Bearer ${token}`;
        const expectedMsg = [
            expect.stringMatching(/^fahrgestellnummer /u),
            expect.stringMatching(/^art /u),
            expect.stringMatching(/^preis /u),
            expect.stringMatching(/^datum /u),
            expect.stringMatching(/^bezeichnung.bezeichnung /u),
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
        const token = await loginRest(client);
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

        expect(message).toEqual(expect.stringContaining('FAHRGESTELLNUMMER'));
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
