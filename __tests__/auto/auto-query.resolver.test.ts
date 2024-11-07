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

/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { type GraphQLRequest } from '@apollo/server';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { HttpStatus } from '@nestjs/common';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { type GraphQLFormattedError } from 'graphql';
import { type Auto, type AutoArt } from '../../src/auto/entity/auto.entity.js';
import {
    host,
    httpsAgent,
    port,
    shutdownServer,
    startServer,
} from '../testserver.js';

export type GraphQLResponseBody = {
    data?: Record<string, any> | null;
    errors?: readonly [GraphQLFormattedError];
};

type AutoDTO = Omit<Auto, 'zubehoer' | 'aktualisiert' | 'erzeugt'>;

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const idVorhanden = '1';

const bezeichnungVorhanden = 'Alpha';
const teilbezeichnungVorhanden = 'a';
const teilbezeichnungNichtVorhanden = 'abc';

const fahrgestellnummerVorhanden = 'WBAKC81020C456789';

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

    test('Auto zu vorhandener ID', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    auto(id: "${idVorhanden}") {
                        version
                        fahrgestellnummer
                        art
                        preis
                        lieferbar
                        datum
                        bezeichnung {
                            bezeichnung
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
        expect(headers['content-type']).toMatch(/json/iu); // eslint-disable-line sonarjs/no-duplicate-string
        expect(data.errors).toBeUndefined();
        expect(data.data).toBeDefined();

        const { auto } = data.data!;
        const result: AutoDTO = auto;

        expect(result.bezeichnung?.bezeichnung).toMatch(/^\w/u);
        expect(result.version).toBeGreaterThan(-1);
        expect(result.id).toBeUndefined();
    });

    test('Auto zu nicht-vorhandener ID', async () => {
        // given
        const id = '999999';
        const body: GraphQLRequest = {
            query: `
                {
                    auto(id: "${id}") {
                        bezeichnung {
                            bezeichnung
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
        expect(data.data!.auto).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message, path, extensions } = error;

        expect(message).toBe(`Es gibt kein Auto mit der ID ${id}.`);
        expect(path).toBeDefined();
        expect(path![0]).toBe('auto');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    test('Auto zu vorhandenem Titel', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    autos(suchkriterien: {
                        bezeichnung: "${bezeichnungVorhanden}"
                    }) {
                        art
                        bezeichnung {
                            bezeichnung
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

        const { autos } = data.data!;

        expect(autos).not.toHaveLength(0);

        const autosArray: AutoDTO[] = autos;

        expect(autosArray).toHaveLength(1);

        const [auto] = autosArray;

        expect(auto!.bezeichnung?.bezeichnung).toBe(bezeichnungVorhanden);
    });

    test('Auto zu vorhandenem Teil-Titel', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    autos(suchkriterien: {
                        bezeichnung: "${teilbezeichnungVorhanden}"
                    }) {
                        bezeichnung {
                            bezeichnung
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

        const { autos } = data.data!;

        expect(autos).not.toHaveLength(0);

        const autosArray: AutoDTO[] = autos;
        autosArray
            .map((auto) => auto.bezeichnung)
            .forEach((bezeichnung) =>
                expect(bezeichnung?.bezeichnung.toLowerCase()).toEqual(
                    expect.stringContaining(teilbezeichnungVorhanden),
                ),
            );
    });

    test('Auto zu nicht vorhandenem Titel', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    autos(suchkriterien: {
                        bezeichnung: "${teilbezeichnungNichtVorhanden}"
                    }) {
                        art
                        bezeichnung {
                            bezeichnung
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
        expect(data.data!.autos).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message, path, extensions } = error;

        expect(message).toMatch(/^Keine Autos gefunden:/u);
        expect(path).toBeDefined();
        expect(path![0]).toBe('autos');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    test('Auto zu vorhandener Fahrgestellnummer', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    autos(suchkriterien: {
                        fahrgestellnummer: "${fahrgestellnummerVorhanden}"
                    }) {
                        fahrgestellnummer
                        bezeichnung {
                            bezeichnung
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

        const { autos } = data.data!;

        expect(autos).not.toHaveLength(0);

        const autosArray: AutoDTO[] = autos;

        expect(autosArray).toHaveLength(1);

        const [auto] = autosArray;
        const { fahrgestellnummer, bezeichnung } = auto!;

        expect(fahrgestellnummer).toBe(fahrgestellnummerVorhanden);
        expect(bezeichnung?.bezeichnung).toBeDefined();
    });

    test('Autos zur Art "SUV"', async () => {
        // given
        const autoArt: AutoArt = 'SUV';
        const body: GraphQLRequest = {
            query: `
                {
                    autos(suchkriterien: {
                        art: ${autoArt}
                    }) {
                        art
                        bezeichnung {
                            bezeichnung
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

        const { autos } = data.data!;

        expect(autos).not.toHaveLength(0);

        const autosArray: AutoDTO[] = autos;

        autosArray.forEach((auto) => {
            const { art, bezeichnung } = auto;

            expect(art).toBe(autoArt);
            expect(bezeichnung?.bezeichnung).toBeDefined();
        });
    });

    test('Autos zur einer ungueltigen Art', async () => {
        // given
        const autoArt = 'UNGUELTIG';
        const body: GraphQLRequest = {
            query: `
                {
                    autos(suchkriterien: {
                        art: ${autoArt}
                    }) {
                        bezeichnung {
                            bezeichnung
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

    test('Autos mit lieferbar=true', async () => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    autos(suchkriterien: {
                        lieferbar: true
                    }) {
                        lieferbar
                        bezeichnung {
                            bezeichnung
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

        const { autos } = data.data!;

        expect(autos).not.toHaveLength(0);

        const autosArray: AutoDTO[] = autos;

        autosArray.forEach((auto) => {
            const { lieferbar, bezeichnung } = auto;

            expect(lieferbar).toBe(true);
            expect(bezeichnung?.bezeichnung).toBeDefined();
        });
    });
});

/* eslint-enable @typescript-eslint/no-unsafe-assignment */
/* eslint-enable max-lines */
