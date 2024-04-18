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
import { type Haus, type HausArt } from '../entity/haus.entity.js';
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
import { Request, Response } from 'express';
import { HausReadService } from '../service/haus-read.service.js';
import { Public } from 'nest-keycloak-connect';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { type Suchkriterien } from '../service/suchkriterien.js';
import { type Adresse } from '../entity/adresse.entity.js';
import { getBaseUri } from './getBaseUri.js';
import { getLogger } from '../../logger/logger.js';
import { paths } from '../../config/paths.js';

export interface Link {
    /** href-Link für HATEOAS-Links */
    readonly href: string;
}

export interface Links {
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
}

export type AdresseModel = Omit<Adresse, 'haus' | 'id'>;

/** Haus-Objekt mit HATEOAS-Links */
export type HausModel = Omit<
    Haus,
    'personen' | 'aktualisiert' | 'erzeugt' | 'id' | 'adresse' | 'version'
> & {
    adresse: AdresseModel;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _links: Links;
};

/** Haus-Objekte mit HATEOAS-Links in einem JSON-Array. */
export interface HaeuserModel {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _embedded: {
        haeuser: HausModel[];
    };
}

export class HausQuery implements Suchkriterien {
    @ApiProperty({ required: false })
    declare readonly art: HausArt;

    @ApiProperty({ required: false })
    declare readonly preis: number;

    @ApiProperty({ required: false })
    declare readonly verkaeuflich: boolean;

    @ApiProperty({ required: false })
    declare readonly datum: string;

    @ApiProperty({ required: false })
    declare readonly katalog: string;

    @ApiProperty({ required: false })
    declare readonly waermepumpe: string;

    @ApiProperty({ required: false })
    declare readonly pool: string;

    @ApiProperty({ required: false })
    declare readonly adresse: string;
}

const APPLICATION_HAL_JSON = 'application/hal+json';

@Controller(paths.rest)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('Haus REST-API')
// @ApiBearerAuth()
// Klassen ab ES 2015
export class HausGetController {
    readonly #service: HausReadService;
    readonly #logger = getLogger(HausGetController.name);

    constructor(service: HausReadService) {
        this.#service = service;
    }

    @Get(':id')
    @Public()
    @ApiOperation({ summary: 'Suche mit der Haus-ID' })
    @ApiParam({
        name: 'id',
        description: 'Z.B. 1',
    })
    @ApiHeader({
        name: 'If-None-Match',
        description: 'Header für bedingte GET-Requests, z.B. "0"',
        required: false,
    })
    @ApiOkResponse({ description: 'Das Haus wurde gefunden' })
    @ApiNotFoundResponse({ description: 'Kein Haus zur ID gefunden' })
    @ApiResponse({
        status: HttpStatus.NOT_MODIFIED,
        description: 'Das Haus wurde bereits heruntergeladen',
    })
    async getById(
        @Param('id') idStr: string,
        @Req() req: Request,
        @Headers('If-None-Match') version: string | undefined,
        @Res() res: Response,
    ): Promise<Response<HausModel | undefined>> {
        this.#logger.debug('getById: idStr=%s, version=%s', idStr, version);
        const id = Number(idStr);
        if (!Number.isInteger(id)) {
            this.#logger.debug('getById: not isInteger()');
            throw new NotFoundException(`Die Haus-ID ${idStr} ist ungueltig.`);
        }

        if (req.accepts([APPLICATION_HAL_JSON, 'json', 'html']) === false) {
            this.#logger.debug('getById: accepted=%o', req.accepted);
            return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
        }

        const haus = await this.#service.findById({ id });
        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug('getById(): haus=%s', haus.toString());
            this.#logger.debug('getById(): adresse=%o', haus.adresse);
        }

        // ETags
        const versionDb = haus.version;
        if (version === `"${versionDb}"`) {
            this.#logger.debug('getById: NOT_MODIFIED');
            return res.sendStatus(HttpStatus.NOT_MODIFIED);
        }
        this.#logger.debug('getById: versionDb=%s', versionDb);
        res.header('ETag', `"${versionDb}"`);

        // HATEOAS mit Atom Links und HAL (= Hypertext Application Language)
        const hausModel = this.#toModel(haus, req);
        this.#logger.debug('getById: hausModel=%o', hausModel);
        return res.contentType(APPLICATION_HAL_JSON).json(hausModel);
    }

    @Get()
    @Public()
    @ApiOperation({ summary: 'Suche mit Suchkriterien' })
    @ApiOkResponse({ description: 'Eine evtl. leere Liste mit Häusern' })
    async get(
        @Query() query: HausQuery,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<Response<HausModel | undefined>> {
        this.#logger.debug('get: query=%o', query);

        if (req.accepts([APPLICATION_HAL_JSON, 'json', 'html']) === false) {
            this.#logger.debug('get: accepted=%o', req.accepted);
            return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
        }

        const haeuser = await this.#service.find(query);
        this.#logger.debug('get: %o', haeuser);

        // HATEOAS: Atom Links je Haus
        const haeuserModel = haeuser.map((haus) =>
            this.#toModel(haus, req, false),
        );
        this.#logger.debug('get: haeuserModel=%o', haeuserModel);

        const result: HaeuserModel = { _embedded: { haeuser: haeuserModel } };
        return res.contentType(APPLICATION_HAL_JSON).json(result).send();
    }

    #toModel(haus: Haus, req: Request, all = true) {
        const baseUri = getBaseUri(req);
        this.#logger.debug('#toModel: baseUri=%s', baseUri);
        const { id } = haus;
        const links = all
            ? {
                  self: { href: `${baseUri}/${id}` },
                  list: { href: `${baseUri}` },
                  add: { href: `${baseUri}` },
                  update: { href: `${baseUri}/${id}` },
                  remove: { href: `${baseUri}/${id}` },
              }
            : { self: { href: `${baseUri}/${id}` } };

        this.#logger.debug('#toModel: haus=%o, links=%o', haus, links);
        const adresseModel: AdresseModel = {
            strasse: haus.adresse?.strasse ?? 'N/A',
            hausnummer: haus.adresse?.hausnummer ?? 'N/A',
            plz: haus.adresse?.plz ?? 'N/A',
        };
        const hausModel: HausModel = {
            art: haus.art,
            preis: haus.preis,
            hausflaeche: haus.hausflaeche,
            verkaeuflich: haus.verkaeuflich,
            baudatum: haus.baudatum,
            katalog: haus.katalog,
            features: haus.features,
            adresse: adresseModel,
            _links: links,
        };

        return hausModel;
    }
}
