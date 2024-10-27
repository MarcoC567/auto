// Copyright (C) 2021 - present Juergen Zimmermann, Hochschule Karlsruhe
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

/**
 * Das Modul besteht aus der Controller-Klasse für Lesen an der REST-Schnittstelle.
 * @packageDocumentation
 */

/* eslint-disable max-lines */
// eslint-disable-next-line max-classes-per-file
import {
    Controller,
    Get,
    Headers,
    HttpStatus,
    NotFoundException,
    Param,
    Query,
    Req,
    Res,
    UseInterceptors,
} from '@nestjs/common';
import {
    ApiHeader,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiProperty,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public } from 'nest-keycloak-connect';
import { paths } from '../../config/paths.js';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { type Auto, type AutoArt } from '../entity/auto.entity.js';
import { type Bezeichnung } from '../entity/bezeichnung.entity.js';
import { AutoReadService } from '../service/auto-read.service.js';
import { type Suchkriterien } from '../service/suchkriterien.js';
import { getBaseUri } from './getBaseUri.js';

/** href-Link für HATEOAS */
export type Link = {
    /** href-Link für HATEOAS-Links */
    readonly href: string;
};

/** Links für HATEOAS */
export type Links = {
    /** self-Link */
    readonly self: Link;
    /** Optionaler Linke für list */
    readonly list?: Link;
    /** Optionaler Linke für add */
    readonly add?: Link;
    /** Optionaler Linke für update */
    readonly update?: Link;
    /** Optionaler Linke für remove */
    readonly remove?: Link;
};

/** Typedefinition für ein Bezeichnung-Objekt ohne Rückwärtsverweis zum Auto */
export type BezeichnungModel = Omit<Bezeichnung, 'auto' | 'id'>;

/** Auto-Objekt mit HATEOAS-Links */
export type AutoModel = Omit<
    Auto,
    | 'zubehoere'
    | 'file'
    | 'aktualisiert'
    | 'erzeugt'
    | 'id'
    | 'bezeichnung'
    | 'version'
> & {
    bezeichnung: BezeichnungModel;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _links: Links;
};

/** Auto-Objekte mit HATEOAS-Links in einem JSON-Array. */
export type AutosModel = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _embedded: {
        autos: AutoModel[];
    };
};

/**
 * Klasse für `AutoGetController`, um Queries in _OpenAPI_ bzw. Swagger zu
 * formulieren. `AutoController` hat dieselben Properties wie die Basisklasse
 * `Auto` - allerdings mit dem Unterschied, dass diese Properties beim Ableiten
 * so überschrieben sind, dass sie auch nicht gesetzt bzw. undefined sein
 * dürfen, damit die Queries flexibel formuliert werden können. Deshalb ist auch
 * immer der zusätzliche Typ undefined erforderlich.
 * Außerdem muss noch `string` statt `Date` verwendet werden, weil es in OpenAPI
 * den Typ Date nicht gibt.
 */
export class AutoQuery implements Suchkriterien {
    @ApiProperty({ required: false })
    declare readonly fahrgestellnummer: string;

    @ApiProperty({ required: false })
    declare readonly art: AutoArt;

    @ApiProperty({ required: false })
    declare readonly preis: number;

    @ApiProperty({ required: false })
    declare readonly lieferbar: boolean;

    @ApiProperty({ required: false })
    declare readonly datum: string;

    @ApiProperty({ required: false })
    declare readonly javascript: string;

    @ApiProperty({ required: false })
    declare readonly typescript: string;

    @ApiProperty({ required: false })
    declare readonly bezeichnung: string;
}

const APPLICATION_HAL_JSON = 'application/hal+json';

/**
 * Die Controller-Klasse für die Verwaltung von Bücher.
 */
// Decorator in TypeScript, zur Standardisierung in ES vorgeschlagen (stage 3)
// https://devblogs.microsoft.com/typescript/announcing-typescript-5-0-beta/#decorators
// https://github.com/tc39/proposal-decorators
@Controller(paths.rest)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('Auto REST-API')
// @ApiBearerAuth()
// Klassen ab ES 2015
export class AutoGetController {
    // readonly in TypeScript, vgl. C#
    // private ab ES 2019
    readonly #service: AutoReadService;

    readonly #logger = getLogger(AutoGetController.name);

    // Dependency Injection (DI) bzw. Constructor Injection
    // constructor(private readonly service: AutoReadService) {}
    // https://github.com/tc39/proposal-type-annotations#omitted-typescript-specific-features-that-generate-code
    constructor(service: AutoReadService) {
        this.#service = service;
    }

    /**
     * Ein Auto wird asynchron anhand seiner ID als Pfadparameter gesucht.
     *
     * Falls es ein solches Auto gibt und `If-None-Match` im Request-Header
     * auf die aktuelle Version des Autoes gesetzt war, wird der Statuscode
     * `304` (`Not Modified`) zurückgeliefert. Falls `If-None-Match` nicht
     * gesetzt ist oder eine veraltete Version enthält, wird das gefundene
     * Auto im Rumpf des Response als JSON-Datensatz mit Atom-Links für HATEOAS
     * und dem Statuscode `200` (`OK`) zurückgeliefert.
     *
     * Falls es kein Auto zur angegebenen ID gibt, wird der Statuscode `404`
     * (`Not Found`) zurückgeliefert.
     *
     * @param idStr Pfad-Parameter `id`
     * @param req Request-Objekt von Express mit Pfadparameter, Query-String,
     *            Request-Header und Request-Body.
     * @param version Versionsnummer im Request-Header bei `If-None-Match`
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    // eslint-disable-next-line max-params
    @Get(':id')
    @Public()
    @ApiOperation({ summary: 'Suche mit der Auto-ID' })
    @ApiParam({
        name: 'id',
        description: 'Z.B. 1',
    })
    @ApiHeader({
        name: 'If-None-Match',
        description: 'Header für bedingte GET-Requests, z.B. "0"',
        required: false,
    })
    @ApiOkResponse({ description: 'Das Auto wurde gefunden' })
    @ApiNotFoundResponse({ description: 'Kein Auto zur ID gefunden' })
    @ApiResponse({
        status: HttpStatus.NOT_MODIFIED,
        description: 'Das Auto wurde bereits heruntergeladen',
    })
    async getById(
        @Param('id') idStr: string,
        @Req() req: Request,
        @Headers('If-None-Match') version: string | undefined,
        @Res() res: Response,
    ): Promise<Response<AutoModel | undefined>> {
        this.#logger.debug('getById: idStr=%s, version=%s', idStr, version);
        const id = Number(idStr);
        if (!Number.isInteger(id)) {
            this.#logger.debug('getById: not isInteger()');
            throw new NotFoundException(`Die Auto-ID ${idStr} ist ungueltig.`);
        }

        if (req.accepts([APPLICATION_HAL_JSON, 'json', 'html']) === false) {
            this.#logger.debug('getById: accepted=%o', req.accepted);
            return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
        }

        const auto = await this.#service.findById({ id });
        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug('getById(): auto=%s', auto.toString());
            this.#logger.debug('getById(): bezeichnung=%o', auto.bezeichnung);
        }

        // ETags
        const versionDb = auto.version;
        if (version === `"${versionDb}"`) {
            this.#logger.debug('getById: NOT_MODIFIED');
            return res.sendStatus(HttpStatus.NOT_MODIFIED);
        }
        this.#logger.debug('getById: versionDb=%s', versionDb);
        res.header('ETag', `"${versionDb}"`);

        // HATEOAS mit Atom Links und HAL (= Hypertext Application Language)
        const autoModel = this.#toModel(auto, req);
        this.#logger.debug('getById: autoModel=%o', autoModel);
        return res.contentType(APPLICATION_HAL_JSON).json(autoModel); // TODO zu beschreibung wechseln?
    }

    /**
     * Bücher werden mit Query-Parametern asynchron gesucht. Falls es mindestens
     * ein solches Auto gibt, wird der Statuscode `200` (`OK`) gesetzt. Im Rumpf
     * des Response ist das JSON-Array mit den gefundenen Büchern, die jeweils
     * um Atom-Links für HATEOAS ergänzt sind.
     *
     * Falls es kein Auto zu den Suchkriterien gibt, wird der Statuscode `404`
     * (`Not Found`) gesetzt.
     *
     * Falls es keine Query-Parameter gibt, werden alle Bücher ermittelt.
     *
     * @param query Query-Parameter von Express.
     * @param req Request-Objekt von Express.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    @Get()
    @Public()
    @ApiOperation({ summary: 'Suche mit Suchkriterien' })
    @ApiOkResponse({ description: 'Eine evtl. leere Liste mit Büchern' })
    async get(
        @Query() query: AutoQuery,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<Response<AutosModel | undefined>> {
        this.#logger.debug('get: query=%o', query);

        if (req.accepts([APPLICATION_HAL_JSON, 'json', 'html']) === false) {
            this.#logger.debug('get: accepted=%o', req.accepted);
            return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
        }

        const autos = await this.#service.find(query);
        this.#logger.debug('get: %o', autos);

        // HATEOAS: Atom Links je Auto
        const autosModel = autos.map((auto) =>
            this.#toModel(auto, req, false),
        );
        this.#logger.debug('get: autosModel=%o', autosModel);

        const result: AutosModel = { _embedded: { autos: autosModel } };
        return res.contentType(APPLICATION_HAL_JSON).json(result).send(); //TODO zu beschreibung wechseln?
    }

    #toModel(auto: Auto, req: Request, all = true) {
        const baseUri = getBaseUri(req);
        this.#logger.debug('#toModel: baseUri=%s', baseUri);
        const { id } = auto;
        const links = all
            ? {
                  self: { href: `${baseUri}/${id}` },
                  list: { href: `${baseUri}` },
                  add: { href: `${baseUri}` },
                  update: { href: `${baseUri}/${id}` },
                  remove: { href: `${baseUri}/${id}` },
              }
            : { self: { href: `${baseUri}/${id}` } };

        this.#logger.debug('#toModel: auto=%o, links=%o', auto, links);
        const bezeichnungModel: BezeichnungModel = {
            // "Optional Chaining" und "Nullish Coalescing" ab ES2020
            bezeichnung: auto.bezeichnung?.bezeichnung ?? 'N/A',
            zusatz: auto.bezeichnung?.zusatz ?? 'N/A',
        };
        const autoModel: AutoModel = {
            fahrgestellnummer: auto.fahrgestellnummer,
            art: auto.art,
            preis: auto.preis,
            lieferbar: auto.lieferbar,
            datum: auto.datum,
            bezeichnung: bezeichnungModel,
            _links: links,
        };

        return autoModel;
    }
}
/* eslint-enable max-lines */
