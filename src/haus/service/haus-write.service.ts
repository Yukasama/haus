/**
 * Das Modul besteht aus der Klasse {@linkcode HausWriteService} für die
 * Schreiboperationen im Anwendungskern.
 * @packageDocumentation
 */

import { type DeleteResult, Repository } from 'typeorm';
import { Injectable, NotFoundException } from '@nestjs/common';
import {
    VersionInvalidException,
    VersionOutdatedException,
} from './exceptions.js';
import { Adresse } from '../entity/adresse.entity.js';
import { Haus } from '../entity/haus.entity.js';
import { HausReadService } from './haus-read.service.js';
import { InjectRepository } from '@nestjs/typeorm';
import { MailService } from '../../mail/mail.service.js';
import { Person } from '../entity/person.entity.js';
import { getLogger } from '../../logger/logger.js';

/** Typdefinitionen zum Aktualisieren eines Hauses mit `update`. */
export interface UpdateParams {
    /** ID des zu aktualisierenden Hauses. */
    readonly id: number | undefined;
    /** Haus-Objekt mit den aktualisierten Werten. */
    readonly haus: Haus;
    /** Versionsnummer für die aktualisierenden Werte. */
    readonly version: string;
}

/**
 * Die Klasse `HausWriteService` implementiert den Anwendungskern für das
 * Schreiben von Haeusern und greift mit _TypeORM_ auf die DB zu.
 */
@Injectable()
export class HausWriteService {
    private static readonly VERSION_PATTERN = /^"\d{1,3}"/u;

    readonly #repo: Repository<Haus>;

    readonly #readService: HausReadService;

    readonly #mailService: MailService;

    readonly #logger = getLogger(HausWriteService.name);

    constructor(
        @InjectRepository(Haus) repo: Repository<Haus>,
        readService: HausReadService,
        mailService: MailService,
    ) {
        this.#repo = repo;
        this.#readService = readService;
        this.#mailService = mailService;
    }

    /**
     * Ein neues Haus soll angelegt werden.
     * @param haus Das neu abzulegende Haus
     * @returns Die ID des neu angelegten Hauses
     */
    async create(haus: Haus): Promise<number> {
        this.#logger.debug('create: haus=%o', haus);

        const hausDb = await this.#repo.save(haus);
        this.#logger.debug('create: hausDb=%o', hausDb);

        await this.#sendmail(hausDb);

        return hausDb.id!;
    }

    /**
     * Ein vorhandenes Haus soll aktualisiert werden.
     * @returns Die neue Versionsnummer gemäß optimistischer Synchronisation
     * @throws NotFoundException falls kein Haus zur ID vorhanden ist
     * @throws VersionInvalidException falls die Versionsnummer ungültig ist
     * @throws VersionOutdatedException falls die Versionsnummer veraltet ist
     */
    async update({ id, haus, version }: UpdateParams): Promise<number> {
        this.#logger.debug(
            'update: id=%d, haus=%o, version=%s',
            id,
            haus,
            version,
        );
        if (id === undefined) {
            this.#logger.debug('update: Keine gueltige ID');
            throw new NotFoundException(`Es gibt kein Haus mit der ID ${id}.`);
        }

        const validateResult = await this.#validateUpdate(haus, id, version);
        this.#logger.debug('update: validateResult=%o', validateResult);
        if (!(validateResult instanceof Haus)) {
            return validateResult;
        }

        const hausNeu = validateResult;
        const merged = this.#repo.merge(hausNeu, haus);
        this.#logger.debug('update: merged=%o', merged);
        const updated = await this.#repo.save(merged);
        this.#logger.debug('update: updated=%o', updated);

        return updated.version!;
    }

    /**
     * Ein Haus wird asynchron anhand seiner ID gelöscht.
     *
     * @param id ID des zu löschenden Hauses
     * @returns true, falls das Haus vorhanden war und gelöscht wurde. Sonst false.
     */
    async delete(id: number) {
        this.#logger.debug('delete: id=%d', id);
        const haus = await this.#readService.findById({
            id,
            mitPersonen: true,
        });

        let deleteResult: DeleteResult | undefined;
        await this.#repo.manager.transaction(async (transactionalMgr) => {
            const adresseId = haus.adresse?.id;
            if (adresseId !== undefined) {
                await transactionalMgr.delete(Adresse, adresseId);
            }
            const personen = haus.personen ?? [];
            for (const person of personen) {
                await transactionalMgr.delete(Person, person.id);
            }

            deleteResult = await transactionalMgr.delete(Haus, id);
            this.#logger.debug('delete: deleteResult=%o', deleteResult);
        });

        return (
            deleteResult?.affected !== undefined &&
            deleteResult.affected !== null &&
            deleteResult.affected > 0
        );
    }

    async #sendmail(haus: Haus) {
        const subject = `Neues Haus ${haus.id}`;
        const adresse = haus.adresse?.plz ?? 'N/A';
        const body = `Das Haus mit der Adresse <strong>${adresse}</strong> ist angelegt`;
        await this.#mailService.sendmail({ subject, body });
    }

    async #validateUpdate(
        haus: Haus,
        id: number,
        versionStr: string,
    ): Promise<Haus> {
        this.#logger.debug(
            '#validateUpdate: haus=%o, id=%s, versionStr=%s',
            haus,
            id,
            versionStr,
        );
        if (!HausWriteService.VERSION_PATTERN.test(versionStr)) {
            throw new VersionInvalidException(versionStr);
        }

        const version = Number.parseInt(versionStr.slice(1, -1), 10);
        this.#logger.debug(
            '#validateUpdate: haus=%o, version=%d',
            haus,
            version,
        );

        const hausDb = await this.#readService.findById({ id });

        const versionDb = hausDb.version!;
        if (version < versionDb) {
            this.#logger.debug('#validateUpdate: versionDb=%d', version);
            throw new VersionOutdatedException(version);
        }
        this.#logger.debug('#validateUpdate: hausDb=%o', hausDb);
        return hausDb;
    }
}
