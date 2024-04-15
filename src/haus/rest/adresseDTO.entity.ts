import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AdresseDTO {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  @ApiProperty({ example: '123 Hauptstrasse', type: String })
  readonly strasse!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @ApiProperty({ example: '12', type: String })
  readonly hausnummer: string | undefined;

  @IsNotEmpty()
  @IsString()
  @MaxLength(10)
  @ApiProperty({ example: '12345', type: String })
  readonly plz!: string;
}
