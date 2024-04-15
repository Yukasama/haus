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
import { AuthGuard, Roles } from 'nest-keycloak-connect';
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
import { HausDTO, HausDtoOhneRef } from './hausDTO.entity.js';
import { Request, Response } from 'express';
import { type Person } from '../entity/person.entity.js';
import { type Haus } from '../entity/haus.entity.js';
import { HausWriteService } from '../service/haus-write.service.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { type Adresse } from '../entity/adresse.entity.js';
import { getBaseUri } from './getBaseUri.js';
import { getLogger } from '../../logger/logger.js';
import { paths } from '../../config/paths.js';

const MSG_FORBIDDEN = 'Kein Token mit ausreichender Berechtigung vorhanden';
/**
 * Die Controller-Klasse für die Verwaltung von Bücher.
 */
@Controller(paths.rest)
@UseGuards(AuthGuard)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('Haus REST-API')
@ApiBearerAuth()
export class HausWriteController {
    readonly #service: HausWriteService;

    readonly #logger = getLogger(HausWriteController.name);

    constructor(service: HausWriteService) {
        this.#service = service;
    }

    @Post()
    @Roles({ roles: ['admin', 'user'] })
    @ApiOperation({ summary: 'Ein neues Haus anlegen' })
    @ApiCreatedResponse({ description: 'Erfolgreich neu angelegt' })
    @ApiBadRequestResponse({ description: 'Fehlerhafte Hausdaten' })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async post(
        @Body() hausDTO: HausDTO,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<Response> {
        this.#logger.debug('post: hausDTO=%o', hausDTO);

        const haus = this.#hausDtoToHaus(hausDTO);
        const id = await this.#service.create(haus);

        const location = `${getBaseUri(req)}/${id}`;
        this.#logger.debug('post: location=%s', location);
        return res.location(location).send();
    }

    @Put(':id')
    @Roles({ roles: ['admin', 'user'] })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Ein vorhandenes HAus aktualisieren',
        tags: ['Aktualisieren'],
    })
    @ApiHeader({
        name: 'If-Match',
        description: 'Header für optimistische Synchronisation',
        required: false,
    })
    @ApiNoContentResponse({ description: 'Erfolgreich aktualisiert' })
    @ApiBadRequestResponse({ description: 'Fehlerhafte Hausdaten' })
    @ApiPreconditionFailedResponse({
        description: 'Falsche Version im Header "If-Match"',
    })
    @ApiResponse({
        status: HttpStatus.PRECONDITION_REQUIRED,
        description: 'Header "If-Match" fehlt',
    })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async put(
        @Body() hausDTO: HausDtoOhneRef,
        @Param('id') id: number,
        @Headers('If-Match') version: string | undefined,
        @Res() res: Response,
    ): Promise<Response> {
        this.#logger.debug(
            'put: id=%s, hausDTO=%o, version=%s',
            id,
            hausDTO,
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

        const haus = this.#hausDtoOhneRefToHaus(hausDTO);
        const neueVersion = await this.#service.update({ id, haus, version });
        this.#logger.debug('put: version=%d', neueVersion);
        return res.header('ETag', `"${neueVersion}"`).send();
    }

    @Delete(':id')
    @Roles({ roles: ['admin'] })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Haus mit der ID löschen' })
    @ApiNoContentResponse({
        description: 'Das Haus wurde gelöscht oder war nicht vorhanden',
    })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async delete(@Param('id') id: number) {
        this.#logger.debug('delete: id=%s', id);
        await this.#service.delete(id);
    }

    #hausDtoToHaus(hausDTO: HausDTO): Haus {
        const adresseDTO = hausDTO.adresse;
        const adresse: Adresse = {
            id: undefined,
            hausnummer: adresseDTO.hausnummer,
            plz: adresseDTO.plz,
            strasse: adresseDTO.strasse,
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
        const haus = {
            id: undefined,
            version: undefined,
            art: hausDTO.art,
            preis: hausDTO.preis,
            hausflaeche: hausDTO.hausflaeche,
            zumVerkauf: hausDTO.zumVerkauf,
            baudatum: hausDTO.baudatum,
            katalog: hausDTO.katalog,
            features: hausDTO.features,
            adresse,
            personen,
            erzeugt: new Date(),
            aktualisiert: new Date(),
        };

        // Rueckwaertsverweise
        haus.adresse.haus = haus;
        haus.personen?.forEach((person) => {
            person.haus = haus;
        });
        return haus;
    }

    #hausDtoOhneRefToHaus(hausDTO: HausDtoOhneRef): Haus {
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

}