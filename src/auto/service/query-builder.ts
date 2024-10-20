// eslint-disable-next-line @eslint-community/eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-unsafe-return */
// eslint-disable-next-line @eslint-community/eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-unsafe-call */
// eslint-disable-next-line @eslint-community/eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * Das Modul besteht aus der Klasse {@linkcode QueryBuilder}.
 * @packageDocumentation
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { typeOrmModuleOptions } from '../../config/typeormOptions.js';
import { getLogger } from '../../logger/logger.js';
import { Auto } from '../entity/auto.entity.js';
import { Bezeichnung } from '../entity/bezeichnung.entity.js';
import { Zubehoer } from '../entity/zubehoer.entity.js';
import { type Suchkriterien } from './suchkriterien.js';

/** Typdefinitionen für die Suche mit der Buch-ID. */
export type BuildIdParams = {
    /** ID des gesuchten Buchs. */
    readonly id: number;
    /** Soll das Zubehör mitgeladen werden? */
    readonly mitZubehoer?: boolean;
};
/**
 * Die Klasse `QueryBuilder` implementiert das Lesen für Bücher und greift
 * mit _TypeORM_ auf eine relationale DB zu.
 */
@Injectable()
export class QueryBuilder {
    readonly #autoAlias = `${Auto.name
        .charAt(0)
        .toLowerCase()}${Auto.name.slice(1)}`;

    readonly #bezeichnungAlias = `${Bezeichnung.name
        .charAt(0)
        .toLowerCase()}${Bezeichnung.name.slice(1)}`;

    readonly #zubehoerAlias = `${Zubehoer.name
        .charAt(0)
        .toLowerCase()}${Zubehoer.name.slice(1)}`;

    readonly #repo: Repository<Auto>;

    readonly #logger = getLogger(QueryBuilder.name);

    constructor(@InjectRepository(Auto) repo: Repository<Auto>) {
        this.#repo = repo;
    }

    /**
     * Ein Buch mit der ID suchen.
     * @param id ID des gesuchten Buches
     * @returns QueryBuilder
     */
    buildId({ id, mitZubehoer = false }: BuildIdParams) {
        // QueryBuilder "auto" fuer Repository<Auto>
        const queryBuilder = this.#repo.createQueryBuilder(this.#autoAlias);

        // Fetch-Join: aus QueryBuilder "auto" die Property "bezeichnung" ->  Tabelle "bezeichnung"
        queryBuilder.innerJoinAndSelect(
            `${this.#autoAlias}.bezeichnung`,
            this.#bezeichnungAlias,
        );

        if (mitZubehoer) {
            // Fetch-Join: aus QueryBuilder "auto" die Property "zubehoere" -> Tabelle "zuebhoer"
            queryBuilder.leftJoinAndSelect(
                `${this.#autoAlias}.zubehore`,
                this.#zubehoerAlias,
            );
        }

        queryBuilder.where(`${this.#autoAlias}.id = :id`, { id: id }); // eslint-disable-line object-shorthand
        return queryBuilder;
    }

    /**
     * Autos asynchron suchen.
     * @param suchkriterien JSON-Objekt mit Suchkriterien
     * @returns QueryBuilder
     */
    // z.B. { bezeichnung: 'a', lieferbar: true, javascript: true }
    // "rest properties" fuer anfaengliche WHERE-Klausel: ab ES 2018 https://github.com/tc39/proposal-object-rest-spread
    // eslint-disable-next-line max-lines-per-function
    build({
        bezeichnung,
        javascript,
        typescript,
        java,
        python,
        ...props
    }: Suchkriterien) {
        this.#logger.debug(
            'build: bezeichnung=%s, javascript=%s, typescript=%s, java=%s, python=%s, props=%o',
            bezeichnung,
            javascript,
            typescript,
            java,
            python,
            props,
        );

        let queryBuilder = this.#repo.createQueryBuilder(this.#autoAlias);
        queryBuilder.innerJoinAndSelect(
            `${this.#autoAlias}.bezeichnung`,
            'bezeichnung',
        );

        // z.B. { bezeichnung: 'a', lieferbar: true, javascript: true }
        // "rest properties" fuer anfaengliche WHERE-Klausel: ab ES 2018 https://github.com/tc39/proposal-object-rest-spread
        // type-coverage:ignore-next-line
        // const { titel, javascript, typescript, ...props } = suchkriterien;

        let useWhere = true;

        // Bezeichnung in der Query: Teilstring der Bezeichnung und "case insensitive"
        // CAVEAT: MySQL hat keinen Vergleich mit "case insensitive"
        // type-coverage:ignore-next-line
        if (bezeichnung !== undefined && typeof bezeichnung === 'string') {
            const ilike =
                typeOrmModuleOptions.type === 'postgres' ? 'ilike' : 'like';
            queryBuilder = queryBuilder.where(
                `${this.#bezeichnungAlias}.bezeichnung ${ilike} :bezeichnung`,
                { bezeichnungl: `%${bezeichnung}%` },
            );
            useWhere = false;
        }

        // Restliche Properties als Key-Value-Paare: Vergleiche auf Gleichheit
        Object.keys(props).forEach((key) => {
            const param: Record<string, any> = {};
            param[key] = (props as Record<string, any>)[key]; // eslint-disable-line security/detect-object-injection
            queryBuilder = useWhere
                ? queryBuilder.where(
                      `${this.#autoAlias}.${key} = :${key}`,
                      param,
                  )
                : queryBuilder.andWhere(
                      `${this.#autoAlias}.${key} = :${key}`,
                      param,
                  );
            useWhere = false;
        });

        this.#logger.debug('build: sql=%s', queryBuilder.getSql());
        return queryBuilder;
    }
}
