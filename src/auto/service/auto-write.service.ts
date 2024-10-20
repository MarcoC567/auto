/* eslint-disable @eslint-community/eslint-comments/disable-enable-pair */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * Das Modul besteht aus der Klasse {@linkcode AutoWriteService} für die
 * Schreiboperationen im Anwendungskern.
 * @packageDocumentation
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type DeleteResult, Repository } from 'typeorm';
import { getLogger } from '../../logger/logger.js';
import { MailService } from '../../mail/mail.service.js';
import { Auto } from '../entity/auto.entity.js';
import { Bezeichnung } from '../entity/bezeichnung.entity.js';
import { Zubehoer } from '../entity/zubehoer.entity.js';
import { AutoReadService } from './auto-read.service.js';
import {
    FahrgestellnummerExistsException,
    VersionInvalidException,
    VersionOutdatedException,
} from './exceptions.js';

/** Typdefinitionen zum Aktualisieren eines Autos mit `update`. */
export type UpdateParams = {
    /** ID des zu aktualisierenden Autos. */
    readonly id: number | undefined;
    /** Auto-Objekt mit den aktualisierten Werten. */
    readonly auto: Auto;
    /** Versionsnummer für die aktualisierenden Werte. */
    readonly version: string;
};

/**
 * Die Klasse `AutoWriteService` implementiert den Anwendungskern für das
 * Schreiben von Autos und greift mit _TypeORM_ auf die DB zu.
 */
@Injectable()
export class AutoWriteService {
    private static readonly VERSION_PATTERN = /^"\d{1,3}"/u;

    readonly #repo: Repository<Auto>;

    readonly #readService: AutoReadService;

    readonly #mailService: MailService;

    readonly #logger = getLogger(AutoWriteService.name);

    constructor(
        @InjectRepository(Auto) repo: Repository<Auto>,
        readService: AutoReadService,
        mailService: MailService,
    ) {
        this.#repo = repo;
        this.#readService = readService;
        this.#mailService = mailService;
    }

    /**
     * Ein neues Auto soll angelegt werden.
     * @param auto Das neu abzulegendeAuto
     * @returns Die ID des neu angelegten Autos
     * @throws FahrgestellnummerExists falls die Fahrgestellnummer bereits existiert
     */
    async create(auto: Auto): Promise<number> {
        this.#logger.debug('create: auto=%o', auto);
        await this.#validateCreate(auto);

        const autoDb = await this.#repo.save(auto); // implizite Transaktion
        this.#logger.debug('create: autoDb=%o', autoDb);

        await this.#sendmail(autoDb);

        return autoDb.id!;
    }

    /**
     * Ein vorhandenes Auto soll aktualisiert werden. "Destructured" Argument
     * mit id (ID des zu aktualisierenden Autos), auto (zu aktualisierendes Auto)
     * und version (Versionsnummer für optimistische Synchronisation).
     * @returns Die neue Versionsnummer gemäß optimistischer Synchronisation
     * @throws NotFoundException falls kein Auto zur ID vorhanden ist
     * @throws VersionInvalidException falls die Versionsnummer ungültig ist
     * @throws VersionOutdatedException falls die Versionsnummer veraltet ist
     */
    // https://2ality.com/2015/01/es6-destructuring.html#simulating-named-parameters-in-javascript
    async update({ id, auto, version }: UpdateParams): Promise<number> {
        this.#logger.debug(
            'update: id=%d, auto=%o, version=%s',
            id,
            auto,
            version,
        );
        if (id === undefined) {
            this.#logger.debug('update: Keine gueltige ID');
            throw new NotFoundException(`Es gibt kein Auto mit der ID ${id}.`);
        }

        const validateResult = await this.#validateUpdate(auto, id, version);
        this.#logger.debug('update: validateResult=%o', validateResult);
        if (!(validateResult instanceof Auto)) {
            return validateResult;
        }

        const autoNeu = validateResult;
        const merged = this.#repo.merge(autoNeu, auto);
        this.#logger.debug('update: merged=%o', merged);
        const updated = await this.#repo.save(merged); // implizite Transaktion
        this.#logger.debug('update: updated=%o', updated);

        return updated.version!;
    }

    /**
     * Ein Auto wird asynchron anhand seiner ID gelöscht.
     *
     * @param id ID des zu löschenden Autos
     * @returns true, falls das Auto vorhanden war und gelöscht wurde. Sonst false.
     */
    async delete(id: number) {
        this.#logger.debug('delete: id=%d', id);
        const auto = await this.#readService.findById({
            id,
            mitZubehoer: true,
        });

        let deleteResult: DeleteResult | undefined;
        await this.#repo.manager.transaction(async (transactionalMgr) => {
            // Das Auto zur gegebenen ID mit Titel und Abb. asynchron loeschen

            // TODO "cascade" funktioniert nicht beim Loeschen
            const bezeichnungId = auto.bezeichnung?.id;
            if (bezeichnungId !== undefined) {
                await transactionalMgr.delete(Bezeichnung, bezeichnungId);
            }
            // "Nullish Coalescing" ab ES2020
            const zubehoere = auto.zubehoere ?? [];
            for (const zubehoer of zubehoere) {
                await transactionalMgr.delete(Zubehoer, zubehoer.id);
            }

            deleteResult = await transactionalMgr.delete(Auto, id);
            this.#logger.debug('delete: deleteResult=%o', deleteResult);
        });

        return (
            deleteResult?.affected !== undefined &&
            deleteResult.affected !== null &&
            deleteResult.affected > 0
        );
    }

    async #validateCreate({ fahrgestellnummer }: Auto): Promise<undefined> {
        this.#logger.debug(
            '#validateCreate: fahrgestellnummer=%s',
            fahrgestellnummer,
        );
        if (await this.#repo.existsBy({ fahrgestellnummer })) {
            throw new FahrgestellnummerExistsException(fahrgestellnummer);
        }
    }

    async #sendmail(auto: Auto) {
        const subject = `Neues Auto ${auto.id}`;
        const bezeichnung = auto.bezeichnung?.bezeichnung ?? 'N/A';
        const body = `Das Auto mit der Bezeichnung <strong>${bezeichnung}</strong> ist angelegt`;
        await this.#mailService.sendmail({ subject, body });
    }

    async #validateUpdate(
        auto: Auto,
        id: number,
        versionStr: string,
    ): Promise<Auto> {
        this.#logger.debug(
            '#validateUpdate: auto=%o, id=%s, versionStr=%s',
            auto,
            id,
            versionStr,
        );
        if (!AutoWriteService.VERSION_PATTERN.test(versionStr)) {
            throw new VersionInvalidException(versionStr);
        }

        const version = Number.parseInt(versionStr.slice(1, -1), 10);
        this.#logger.debug(
            '#validateUpdate: auto=%o, version=%d',
            auto,
            version,
        );

        const autoDb = await this.#readService.findById({ id });

        // nullish coalescing
        const versionDb = autoDb.version!;
        if (version < versionDb) {
            this.#logger.debug('#validateUpdate: versionDb=%d', version);
            throw new VersionOutdatedException(version);
        }
        this.#logger.debug('#validateUpdate: autoDb=%o', autoDb);
        return autoDb;
    }
}
