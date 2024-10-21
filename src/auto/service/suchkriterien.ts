/**
 * Das Modul besteht aus der Klasse {@linkcode Suchkriterien}.
 * @packageDocumentation
 */

import { type AutoArt } from './../entity/auto.entity.js';

/**
 * Typdefinition für `find` in `auto-read.service` und `QueryBuilder.build()`.
 */
export type Suchkriterien = {
    readonly fahrgestellnummer?: string;
    readonly art?: AutoArt;
    readonly preis?: number;
    readonly lieferbar?: boolean;
    readonly datum?: string;
    readonly javascript?: string;
    readonly typescript?: string;
    readonly java?: string;
    readonly python?: string;
    readonly bezeichnung?: string;
};
