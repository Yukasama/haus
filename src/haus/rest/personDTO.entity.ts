import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, MaxLength } from 'class-validator';

export class PersonDTO {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    @MaxLength(255)
    @ApiProperty({ example: 'John', type: String })
    readonly vorname!: string;

    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    @MaxLength(255)
    @ApiProperty({ example: 'Doe', type: String })
    readonly nachname!: string;

    @IsBoolean()
    @ApiProperty({ example: true, type: Boolean })
    readonly eigentuemer: boolean | undefined;
}
