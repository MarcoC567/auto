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

/* eslint-disable max-lines, @typescript-eslint/no-unsafe-assignment */

import { type GraphQLRequest } from '@apollo/server';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { HttpStatus } from '@nestjs/common';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import {
    host,
    httpsAgent,
    port,
    shutdownServer,
    startServer,
} from '../testserver.js';
import { tokenGraphQL } from '../token.js';
import { type GraphQLResponseBody } from './auto-query.resolver.test.js';

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
    test('Neues Auto', async () => {
        // given
        const token = await tokenGraphQL(client);
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const body: GraphQLQuery = {
            query: `
                mutation {
                    create(
                        input: {
                             fahrgestellnummer: "SAJAB51B9XC85678T",
                             art: LIMOUSINE,
                             preis: 70000.00,
                             lieferbar: true,
                             datum: "2022-01-31",
                             bezeichnung: {
                              bezeichnung: "G-Klasse",
                              zusatz: "richtig cool"
                                          },
                             zubehoere: [{
                              name: "Automatik",
                              beschreibung: "hat keine Schaltung"
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
    //     test('Auto mit ungueltigen Werten neu anlegen', async () => {
    //         // given
    //         const token = await tokenGraphQL(client);
    //         const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
    //         const body: GraphQLQuery = {
    //             query: `
    //                 mutation {
    //   create(
    //     input: {
    //       fahrgestellnummer: "SAJAB51B9XC85678T",
    //       art: FALSCH,
    //       preis: -70000,
    //       lieferbar: true,
    //       datum: "2022-01-31F",
    //       bezeichnung: {bezeichnung: 'Titelpost',
    //         zusatz: 'untertitelpos',
    //         },

    //     }
    //   ) {
    //       id
    //   }
    // }
    //             `,
    //         };
    //         const expectedMsg = [
    //             expect.stringMatching(/^art /u),
    //             expect.stringMatching(/^preis /u),
    //             expect.stringMatching(/^datum /u),
    //         ];

    //         // when
    //         const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
    //             await client.post(graphqlPath, body, { headers: authorization });

    //         // then
    //         expect(status).toBe(HttpStatus.OK);
    //         expect(headers['content-type']).toMatch(/json/iu);
    //         expect(data.data!.create).toBeNull();

    //         const { errors } = data;

    //         expect(errors).toHaveLength(1);

    //         const [error] = errors!;

    //         expect(error).toBeDefined();

    //         const { message } = error;
    //         const messages: string[] = message.split(',');

    //         expect(messages).toBeDefined();
    //         expect(messages).toHaveLength(expectedMsg.length);
    //         expect(messages).toEqual(expect.arrayContaining(expectedMsg));
    //     });

    // -------------------------------------------------------------------------
    test('Auto aktualisieren', async () => {
        // given
        const token = await tokenGraphQL(client);
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const body: GraphQLQuery = {
            query: `
                mutation {
  update(
    input: {
      id: "40",
      version: 0,
      fahrgestellnummer: "TEST12345678",
      art: LIMOUSINE,
      preis: 444.44,
      lieferbar: false,
      datum: "2022-04-04",
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
    //     test('Auto mit ungueltigen Werten aktualisieren', async () => {
    //         // given
    //         const token = await tokenGraphQL(client);
    //         const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
    //         const id = '40';
    //         const body: GraphQLQuery = {
    //             query: `
    //                  mutation {
    //   update(
    //     input: {
    //       id: ${id},
    //       version: 1,
    //       fahrgestellnummer: "TEST12345678",
    //       art: FALSCH,
    //       preis: -444,
    //       lieferbar: false,
    //       datum: "2022-04-04E",
    //     }
    //   ) {
    //       version
    //   }
    // }
    //             `,
    //         };
    //         const expectedMsg = [
    //             expect.stringMatching(/^art /u),
    //             expect.stringMatching(/^preis /u),
    //             expect.stringMatching(/^datum /u),
    //         ];

    //         // when
    //         const { status, headers, data }: AxiosResponse<GraphQLResponseBody> =
    //             await client.post(graphqlPath, body, { headers: authorization });

    //         // then
    //         expect(status).toBe(HttpStatus.OK);
    //         expect(headers['content-type']).toMatch(/json/iu);
    //         expect(data.data!.update).toBeNull();

    //         const { errors } = data;

    //         expect(errors).toHaveLength(1);

    //         const [error] = errors!;
    //         const { message } = error;
    //         const messages: string[] = message.split(',');

    //         expect(messages).toBeDefined();
    //         expect(messages).toHaveLength(expectedMsg.length);
    //         expect(messages).toEqual(expect.arrayContaining(expectedMsg));
    //     });

    // -------------------------------------------------------------------------
    test('Nicht vorhandenes Auto aktualisieren', async () => {
        // given
        const token = await tokenGraphQL(client);
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const id = '999999';
        const body: GraphQLQuery = {
            query: `
                mutation {
                    update(
                        input: {
                             id: "${id}",
                             version: 0,
                             fahrgestellnummer: "SAJAB51B9XC85678T",
                             art: LIMOUSINE,
                             preis: 70000.00,
                             lieferbar: true,
                             datum: "2022-01-31",
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
            `Es gibt kein Auto mit der ID ${id.toLowerCase()}.`,
        );
        expect(path).toBeDefined();
        expect(path![0]).toBe('update');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    // -------------------------------------------------------------------------
    test('Auto loeschen', async () => {
        // given
        const token = await tokenGraphQL(client);
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
    test('Auto loeschen als "user"', async () => {
        // given
        const token = await tokenGraphQL(client, 'user', 'p');
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
