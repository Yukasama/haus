// eslint-disable-next-line max-classes-per-file
import {
    ArrayUnique,
    IsArray,
    IsBoolean,
    IsISO8601,
    IsInt,
    IsOptional,
    IsPositive,
    IsUrl,
    Matches,
    Min,
    ValidateNested,
} from 'class-validator';
import { PersonDTO } from './personDTO.entity.js';
import { ApiProperty } from '@nestjs/swagger';
import { type HausArt } from '../entity/haus.entity.js';
import { AdresseDTO } from './adresseDTO.entity.js';
import { Type } from 'class-transformer';
// BUNGALOW' | 'MEHRFAMILIENHAUS' | 'REIHENHAUS' | 'VILLA'
export class HausDtoOhneRef {
    @Matches(/^BUNGALOW$|^MEHRFAMILIENHAUS$|^REIHENHAUS$|^VILLA/u)
    @IsOptional()
    @IsOptional()
    @ApiProperty({ example: 'BUNGALOW', type: String })
    readonly art: HausArt | undefined;

    @IsPositive()
    @ApiProperty({ example: 1, type: Number })
    // statt number ggf. Decimal aus decimal.js analog zu BigDecimal von Java
    readonly preis!: number;

    @IsInt()
    @Min(0)
    @IsPositive()
    @ApiProperty({ example: 5, type: Number })
    readonly hausflaeche: number | undefined;

    @IsBoolean()
    @ApiProperty({ example: true, type: Boolean })
    readonly verkaeuflich: boolean | undefined;

    @IsISO8601({ strict: true })
    @IsOptional()
    @ApiProperty({ example: '2021-01-31' })
    readonly baudatum: Date | string | undefined;

    @IsUrl()
    @IsOptional()
    @ApiProperty({ example: 'https://www.haus.de/', type: String })
    readonly katalog: string | undefined;

    @IsOptional()
    @ArrayUnique()
    @ApiProperty({ example: ['Garten', 'Swimmingpool'], type: [String] })
    readonly features: string[] | undefined;
}

export class HausDTO extends HausDtoOhneRef {
    @ValidateNested()
    @Type(() => AdresseDTO)
    @ApiProperty({ type: AdresseDTO })
    readonly adresse!: AdresseDTO;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PersonDTO)
    @ApiProperty({ type: [PersonDTO] })
    readonly personen: PersonDTO[] | undefined;
}
