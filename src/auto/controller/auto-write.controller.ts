/**
 * Das Modul besteht aus der Controller-Klasse für Schreiben an der REST-Schnittstelle.
 * @packageDocumentation
 */

import {
    Body,
    Controller,
    Delete,
    Headers,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiHeader,
    ApiNoContentResponse,
    ApiOperation,
    ApiPreconditionFailedResponse,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthGuard, Roles } from 'nest-keycloak-connect';
import { paths } from '../../config/paths.js';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { Auto } from '../entity/auto.entity.js';
import { Bezeichnung } from '../entity/bezeichnung.entity.js';
import { Zubehoer } from '../entity/zubehoer.entity.js';
import { AutoWriteService } from '../service/auto-write.service.js';
import { AutoDTO, AutoDtoOhneRef } from './autoDTO.entity.js';
import { getBaseUri } from './getBaseUri.js';

const MSG_FORBIDDEN = 'Kein Token mit ausreichender Berechtigung vorhanden';
/**
 * Die Controller-Klasse für die Verwaltung von Autos.
 */
@Controller(paths.rest)
@UseGuards(AuthGuard)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('Auto REST-API')
@ApiBearerAuth()
export class AutoWriteController {
    readonly #service: AutoWriteService;

    readonly #logger = getLogger(AutoWriteController.name);

    constructor(service: AutoWriteService) {
        this.#service = service;
    }

    /**
     * Ein neues Auto wird asynchron angelegt. Das neu anzulegende Auto ist als
     * JSON-Datensatz im Request-Objekt enthalten. Wenn es keine
     * Verletzungen von Constraints gibt, wird der Statuscode `201` (`Created`)
     * gesetzt und im Response-Header wird `Location` auf die URI so gesetzt,
     * dass damit das neu angelegte Auto abgerufen werden kann.
     *
     * Falls Constraints verletzt sind, wird der Statuscode `400` (`Bad Request`)
     * gesetzt und genauso auch wenn der Bezeichnung oder die Fahrgestellnummer bereits
     * existieren.
     *
     * @param autoDTO JSON-Daten für ein Auto im Request-Body.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    @Post()
    @Roles({ roles: ['admin', 'user'] })
    @ApiOperation({ summary: 'Ein neues Auto anlegen' })
    @ApiCreatedResponse({ description: 'Erfolgreich neu angelegt' })
    @ApiBadRequestResponse({ description: 'Fehlerhafte Autodaten' })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async post(
        @Body() autoDTO: AutoDTO,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<Response> {
        this.#logger.debug('post: autoDTO=%o', autoDTO);

        const auto = this.#autoDtoToAuto(autoDTO);
        const id = await this.#service.create(auto);

        const location = `${getBaseUri(req)}/${id}`;
        this.#logger.debug('post: location=%s', location);
        return res.location(location).send();
    }

    /**
     * Ein vorhandenes Auto wird asynchron aktualisiert.
     *
     * Im Request-Objekt von Express muss die ID des zu aktualisierenden Autos
     * als Pfad-Parameter enthalten sein. Außerdem muss im Rumpf das zu
     * aktualisierende Auto als JSON-Datensatz enthalten sein. Damit die
     * Aktualisierung überhaupt durchgeführt werden kann, muss im Header
     * `If-Match` auf die korrekte Version für optimistische Synchronisation
     * gesetzt sein.
     *
     * Bei erfolgreicher Aktualisierung wird der Statuscode `204` (`No Content`)
     * gesetzt und im Header auch `ETag` mit der neuen Version mitgeliefert.
     *
     * Falls die Versionsnummer fehlt, wird der Statuscode `428` (`Precondition
     * required`) gesetzt; und falls sie nicht korrekt ist, der Statuscode `412`
     * (`Precondition failed`). Falls Constraints verletzt sind, wird der
     * Statuscode `400` (`Bad Request`) gesetzt und genauso auch wenn die neue
     * Bezeichnung oder die neue Fahrgestellnummer bereits existieren.
     *
     * @param autoDTO Autodaten im Body des Request-Objekts.
     * @param id Pfad-Paramater für die ID.
     * @param version Versionsnummer aus dem Header _If-Match_.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    // eslint-disable-next-line max-params
    @Put(':id')
    @Roles({ roles: ['admin', 'user'] })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Ein vorhandenes Auto aktualisieren',
        tags: ['Aktualisieren'],
    })
    @ApiHeader({
        name: 'If-Match',
        description: 'Header für optimistische Synchronisation',
        required: false,
    })
    @ApiNoContentResponse({ description: 'Erfolgreich aktualisiert' })
    @ApiBadRequestResponse({ description: 'Fehlerhafte Autodaten' })
    @ApiPreconditionFailedResponse({
        description: 'Falsche Version im Header "If-Match"',
    })
    @ApiResponse({
        status: HttpStatus.PRECONDITION_REQUIRED,
        description: 'Header "If-Match" fehlt',
    })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async put(
        @Body() autoDTO: AutoDtoOhneRef,
        @Param('id') id: number,
        @Headers('If-Match') version: string | undefined,
        @Res() res: Response,
    ): Promise<Response> {
        this.#logger.debug(
            'put: id=%s, autoDTO=%o, version=%s',
            id,
            autoDTO,
            version,
        );

        if (version === undefined) {
            const msg = 'Header "If-Match" fehlt';
            this.#logger.debug('put: msg=%s', msg);
            return res
                .status(HttpStatus.PRECONDITION_REQUIRED)
                .set('Content-Type', 'application/json')
                .send(msg);
        }

        const auto = this.#autoDtoOhneRefToAuto(autoDTO);
        const neueVersion = await this.#service.update({ id, auto, version });
        this.#logger.debug('put: version=%d', neueVersion);
        return res.header('ETag', `"${neueVersion}"`).send();
    }

    /**
     * Ein Auto wird anhand seiner ID-gelöscht, die als Pfad-Parameter angegeben
     * ist. Der zurückgelieferte Statuscode ist `204` (`No Content`).
     *
     * @param id Pfad-Paramater für die ID.
     * @returns Leeres Promise-Objekt.
     */
    @Delete(':id')
    @Roles({ roles: ['admin'] })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Auto mit der ID löschen' })
    @ApiNoContentResponse({
        description: 'Das Auto wurde gelöscht oder war nicht vorhanden',
    })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async delete(@Param('id') id: number) {
        this.#logger.debug('delete: id=%s', id);
        await this.#service.delete(id);
    }

    #autoDtoToAuto(autoDTO: AutoDTO): Auto {
        const bezeichnungDTO = autoDTO.bezeichnung;
        const bezeichnung: Bezeichnung = {
            id: undefined,
            bezeichnung: bezeichnungDTO.bezeichnung,
            zusatz: bezeichnungDTO.zusatz,
            auto: undefined,
        };
        const zubehoere = autoDTO.zubehoere?.map((zubehoerDTO) => {
            const zubehoer: Zubehoer = {
                id: undefined,
                name: zubehoerDTO.name,
                beschreibung: zubehoerDTO.beschreibung,
                auto: undefined,
            };
            return zubehoer;
        });
        const auto = {
            id: undefined,
            version: undefined,
            fahrgestellnummer: autoDTO.fahrgestellnummer,
            art: autoDTO.art,
            preis: autoDTO.preis,
            lieferbar: autoDTO.lieferbar,
            datum: autoDTO.datum,
            bezeichnung,
            zubehoere,
            file: undefined,
            erzeugt: new Date(),
            aktualisiert: new Date(),
        };

        // Rueckwaertsverweise
        auto.bezeichnung.auto = auto;
        auto.zubehoere?.forEach((zubehoer) => {
            zubehoer.auto = auto;
        });
        return auto;
    }

    #autoDtoOhneRefToAuto(autoDTO: AutoDtoOhneRef): Auto {
        return {
            id: undefined,
            version: undefined,
            fahrgestellnummer: autoDTO.fahrgestellnummer,
            art: autoDTO.art,
            preis: autoDTO.preis,
            lieferbar: autoDTO.lieferbar,
            datum: autoDTO.datum,
            bezeichnung: undefined,
            zubehoere: undefined,
            erzeugt: undefined,
            aktualisiert: new Date(),
        };
    }
}
