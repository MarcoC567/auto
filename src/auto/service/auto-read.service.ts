// eslint-disable-next-line @eslint-community/eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/**
 * Das Modul besteht aus der Klasse {@linkcode AutoReadService}.
 * @packageDocumentation
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { getLogger } from '../../logger/logger.js';
import { Auto } from './../entity/auto.entity.js';
import { QueryBuilder } from './query-builder.js';
import { type Suchkriterien } from './suchkriterien.js';

/**
 * Typdefinition für `findById`
 */
export type FindByIdParams = {
    /** ID des gesuchten Autos */
    readonly id: number;
    /** Soll die Fahrgestellnummer mitgeladen werden? */
    readonly mitZubehoer?: boolean;
};

/**
 * Die Klasse `AutoReadService` implementiert das Lesen für Autos und greift
 * mit _TypeORM_ auf eine relationale DB zu.
 */
@Injectable()
export class AutoReadService {
    static readonly ID_PATTERN = /^[1-9]\d{0,10}$/u;

    readonly #autoProps: string[];

    readonly #queryBuilder: QueryBuilder;

    readonly #logger = getLogger(AutoReadService.name);

    constructor(queryBuilder: QueryBuilder) {
        const autoDummy = new Auto();
        this.#autoProps = Object.getOwnPropertyNames(autoDummy);
        this.#queryBuilder = queryBuilder;
    }

    /**
     * Ein Auto asynchron anhand seiner ID suchen
     * @param id ID des gesuchten Autos
     * @returns Das gefundene Auto in einem Promise aus ES2015.
     * @throws NotFoundException falls kein Auto mit der ID existiert
     */
    // https://2ality.com/2015/01/es6-destructuring.html#simulating-named-parameters-in-javascript
    async findById({ id, mitZubehoer = false }: FindByIdParams) {
        this.#logger.debug('findById: id=%d', id);

        // https://typeorm.io/working-with-repository
        // Das Resultat ist undefined, falls kein Datensatz gefunden
        // Lesen: Keine Transaktion erforderlich
        const auto = await this.#queryBuilder
            .buildId({ id, mitZubehoer })
            .getOne();
        if (auto === null) {
            throw new NotFoundException(`Es gibt kein Auto mit der ID ${id}.`);
        }

        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug(
                'findById: auto=%s, bezeichnung=%o',
                auto.toString(),
                auto.bezeichnung,
            );
            if (mitZubehoer) {
                this.#logger.debug('findById: zubehoer=%o', auto.zubehoere);
            }
        }
        return auto;
    }

    /**
     * Autos asynchron suchen.
     * @param suchkriterien JSON-Objekt mit Suchkriterien
     * @returns Ein JSON-Array mit den gefundenen Autosn.
     * @throws NotFoundException falls keine Autos gefunden wurden.
     */
    async find(suchkriterien?: Suchkriterien) {
        this.#logger.debug('find: suchkriterien=%o', suchkriterien);

        // Keine Suchkriterien?
        if (suchkriterien === undefined) {
            return this.#queryBuilder.build({}).getMany();
        }
        const keys = Object.keys(suchkriterien);
        if (keys.length === 0) {
            return this.#queryBuilder.build(suchkriterien).getMany();
        }

        // Falsche Namen fuer Suchkriterien?
        if (!this.#checkKeys(keys)) {
            throw new NotFoundException('Ungueltige Suchkriterien');
        }

        // QueryBuilder https://typeorm.io/select-query-builder
        // Das Resultat ist eine leere Liste, falls nichts gefunden
        // Lesen: Keine Transaktion erforderlich
        const autos = await this.#queryBuilder.build(suchkriterien).getMany();
        if (autos.length === 0) {
            this.#logger.debug('find: Keine Autos gefunden');
            throw new NotFoundException(
                `Keine Autos gefunden: ${JSON.stringify(suchkriterien)}`,
            );
        }
        this.#logger.debug('find: autos=%o', autos);
        return autos;
    }

    #checkKeys(keys: string[]) {
        // Ist jedes Suchkriterium auch eine Property von Auto?
        let validKeys = true;
        keys.forEach((key) => {
            if (
                !this.#autoProps.includes(key) &&
                key !== 'javascript' &&
                key !== 'typescript'
            ) {
                this.#logger.debug(
                    '#checkKeys: ungueltiges Suchkriterium "%s"',
                    key,
                );
                validKeys = false;
            }
        });

        return validKeys;
    }
}
