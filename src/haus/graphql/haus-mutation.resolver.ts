import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthGuard, Roles } from 'nest-keycloak-connect';
import { IsInt, IsNumberString, Min } from 'class-validator';
import { UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { type Person } from '../entity/person.entity.js';
import { type Haus } from '../entity/haus.entity.js';
import { HausDTO } from '../rest/hausDTO.entity.js';
import { HausWriteService } from '../service/haus-write.service.js';
import { HttpExceptionFilter } from './http-exception.filter.js';
import { type IdInput } from './haus-query.resolver.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { type Adresse } from '../entity/adresse.entity.js';
import { getLogger } from '../../logger/logger.js';

export interface CreatePayload {
    readonly id: number;
}

export interface UpdatePayload {
    readonly version: number;
}

export class HausUpdateDTO extends HausDTO {
    @IsNumberString()
    readonly id!: string;

    @IsInt()
    @Min(0)
    readonly version!: number;
}

@Resolver()
@UseGuards(AuthGuard)
@UseFilters(HttpExceptionFilter)
@UseInterceptors(ResponseTimeInterceptor)
export class HausMutationResolver {
    readonly #service: HausWriteService;

    readonly #logger = getLogger(HausMutationResolver.name);

    constructor(service: HausWriteService) {
        this.#service = service;
    }

    @Mutation()
    @Roles({ roles: ['admin', 'user'] })
    async create(@Args('input') hausDTO: HausDTO) {
        this.#logger.debug('create: hausDTO=%o', hausDTO);

        const haus = this.#hausDtoToHaus(hausDTO);
        const id = await this.#service.create(haus);
        this.#logger.debug('createHaus: id=%d', id);

        const payload: CreatePayload = { id };
        return payload;
    }

    @Mutation()
    @Roles({ roles: ['admin', 'user'] })
    async update(@Args('input') hausDTO: HausUpdateDTO) {
        this.#logger.debug('update: haus=%o', hausDTO);

        const haus = this.#hausUpdateDtoToHaus(hausDTO);
        const versionStr = `"${hausDTO.version.toString()}"`;

        const versionResult = await this.#service.update({
            id: Number.parseInt(hausDTO.id, 10),
            haus,
            version: versionStr,
        });

        this.#logger.debug('updateHaus: versionResult=%d', versionResult);
        const payload: UpdatePayload = { version: versionResult };
        return payload;
    }

    @Mutation()
    @Roles({ roles: ['admin'] })
    async delete(@Args() id: IdInput) {
        const idStr = id.id;
        this.#logger.debug('delete: id=%s', idStr);

        const deletePerformed = await this.#service.delete(idStr);
        this.#logger.debug('deleteHaus: deletePerformed=%s', deletePerformed);

        return deletePerformed;
    }

    #hausDtoToHaus(hausDTO: HausDTO): Haus {
        const adresseDTO = hausDTO.adresse;
        const adresse: Adresse = {
            id: undefined,
            strasse: adresseDTO.strasse,
            hausnummer: adresseDTO.hausnummer,
            plz: adresseDTO.plz,
            haus: undefined,
        };

        const personen = hausDTO.personen?.map((personDTO) => {
            const person: Person = {
                id: undefined,
                vorname: personDTO.vorname,
                nachname: personDTO.nachname,
                eigentuemer: personDTO.eigentuemer,
                haus: undefined,
            };
            return person;
        });

        const haus: Haus = {
            id: undefined,
            version: undefined,
            hausflaeche: hausDTO.hausflaeche,
            art: hausDTO.art,
            preis: hausDTO.preis,
            zumVerkauf: hausDTO.zumVerkauf,
            baudatum: hausDTO.baudatum,
            katalog: hausDTO.katalog,
            features: hausDTO.features,
            adresse,
            personen,
            erzeugt: new Date(),
            aktualisiert: new Date(),
        };

        haus.adresse!.haus = haus;
        return haus;
    }

    #hausUpdateDtoToHaus(hausDTO: HausUpdateDTO): Haus {
        return {
            id: undefined,
            version: undefined,
            hausflaeche: hausDTO.hausflaeche,
            art: hausDTO.art,
            preis: hausDTO.preis,
            zumVerkauf: hausDTO.zumVerkauf,
            baudatum: hausDTO.baudatum,
            katalog: hausDTO.katalog,
            features: hausDTO.features,
            adresse: undefined,
            personen: undefined,
            erzeugt: undefined,
            aktualisiert: new Date(),
        };
    }

    // #errorMsgCreateHaus(err: CreateError) {
    //     switch (err.type) {
    //         case 'IsbnExists': {
    //             return `Die ISBN ${err.isbn} existiert bereits`;
    //         }
    //         default: {
    //             return 'Unbekannter Fehler';
    //         }
    //     }
    // }

    // #errorMsgUpdateHaus(err: UpdateError) {
    //     switch (err.type) {
    //         case 'HausNotExists': {
    //             return `Es gibt kein Haus mit der ID ${err.id}`;
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
