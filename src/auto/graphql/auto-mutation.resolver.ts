// eslint-disable-next-line max-classes-per-file
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthGuard, Roles } from 'nest-keycloak-connect';
import { IsInt, IsNumberString, Min } from 'class-validator';
import { UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { type Auto } from '../entity/auto.entity.js';
import { AutoDTO } from '../rest/autoDTO.entity.js';
import { AutoWriteService } from '../service/auto-write.service.js';
import { type Bezeichnung } from '../entity/bezeichnung.entity.js';
import { HttpExceptionFilter } from './http-exception.filter.js';
import { type IdInput } from './auto-query.resolver.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { type Zubehoer } from '../entity/zubehoer.entity.js';
import { getLogger } from '../../logger/logger.js';

// Authentifizierung und Autorisierung durch
//  GraphQL Shield
//      https://www.graphql-shield.com
//      https://github.com/maticzav/graphql-shield
//      https://github.com/nestjs/graphql/issues/92
//      https://github.com/maticzav/graphql-shield/issues/213
//  GraphQL AuthZ
//      https://github.com/AstrumU/graphql-authz
//      https://www.the-guild.dev/blog/graphql-authz

export interface CreatePayload {
    readonly id: number;
}

export interface UpdatePayload {
    readonly version: number;
}

export class AutoUpdateDTO extends AutoDTO {
    @IsNumberString()
    readonly id!: string;

    @IsInt()
    @Min(0)
    readonly version!: number;
}
@Resolver()
// alternativ: globale Aktivierung der Guards https://docs.nestjs.com/security/authorization#basic-rbac-implementation
@UseGuards(AuthGuard)
@UseFilters(HttpExceptionFilter)
@UseInterceptors(ResponseTimeInterceptor)
export class AutoMutationResolver {
    readonly #service: AutoWriteService;

    readonly #logger = getLogger(AutoMutationResolver.name);

    constructor(service: AutoWriteService) {
        this.#service = service;
    }

    @Mutation()
    @Roles({ roles: ['admin', 'user'] })
    async create(@Args('input') autoDTO: AutoDTO) {
        this.#logger.debug('create: autoDTO=%o', autoDTO);

        const auto = this.#autoDtoToAuto(autoDTO);
        const id = await this.#service.create(auto);
        // TODO BadUserInputError
        this.#logger.debug('createAuto: id=%d', id);
        const payload: CreatePayload = { id };
        return payload;
    }

    @Mutation()
    @Roles({ roles: ['admin', 'user'] })
    async update(@Args('input') autoDTO: AutoUpdateDTO) {
        this.#logger.debug('update: auto=%o', autoDTO);

        const auto = this.#autoUpdateDtoToAuto(autoDTO);
        const versionStr = `"${autoDTO.version.toString()}"`;

        const versionResult = await this.#service.update({
            id: Number.parseInt(autoDTO.id, 10),
            auto,
            version: versionStr,
        });
        // TODO BadUserInputError
        this.#logger.debug('updateAuto: versionResult=%d', versionResult);
        const payload: UpdatePayload = { version: versionResult };
        return payload;
    }

    @Mutation()
    @Roles({ roles: ['admin'] })
    async delete(@Args() id: IdInput) {
        const idStr = id.id;
        this.#logger.debug('delete: id=%s', idStr);
        const deletePerformed = await this.#service.delete(idStr);
        this.#logger.debug('deleteAuto: deletePerformed=%s', deletePerformed);
        return deletePerformed;
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
        const auto: Auto = {
            id: undefined,
            version: undefined,
            fahrgestellnummer: autoDTO.fahrgestellnummer,
            art: autoDTO.art,
            preis: autoDTO.preis,
            lieferbar: autoDTO.lieferbar,
            datum: autoDTO.datum,
            bezeichnung,
            zubehoere,
            erzeugt: new Date(),
            aktualisiert: new Date(),
        };

        // Rueckwaertsverweis
        auto.bezeichnung!.auto = auto;
        return auto;
    }

    #autoUpdateDtoToAuto(autoDTO: AutoUpdateDTO): Auto {
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

    // #errorMsgCreateAuto(err: CreateError) {
    //     switch (err.type) {
    //         case 'FahrgestellnummerExists': {
    //             return `Die ISBN ${err.fahrgestellnummer} existiert bereits`;
    //         }
    //         default: {
    //             return 'Unbekannter Fehler';
    //         }
    //     }
    // }

    // #errorMsgUpdateAuto(err: UpdateError) {
    //     switch (err.type) {
    //         case 'AutoNotExists': {
    //             return `Es gibt kein Auto mit der ID ${err.id}`;
    //         }
    //         case 'VersionInvalid': {
    //             return `"${err.version}" ist keine gueltige Versionsnummer`;
    //         }
    //         case 'VersionOutdated': {
    //             return `Die Versionsnummer "${err.version}" ist nicht mehr aktuell`;
    //         }
    //         default: {
    //             return 'Unbekannter Fehler';
    //         }
    //     }
    // }
}
