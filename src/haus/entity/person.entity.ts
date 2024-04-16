import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Haus } from './haus.entity.js';

@Entity()
export class Person {
    @PrimaryGeneratedColumn()
    id: number | undefined;

    @Column()
    readonly vorname!: string;

    @Column()
    readonly nachname!: string;

    @Column('decimal')
    @ApiProperty({ example: true, type: Boolean })
    readonly eigentuemer: boolean | undefined;

    @ManyToOne(() => Haus, (haus) => haus.personen)
    @JoinColumn({ name: 'haus_id' })
    haus: Haus | undefined;

    public toString = (): string =>
        JSON.stringify({
            id: this.id,
            vorname: this.vorname,
            nachname: this.nachname,
            eigentuemer: this.eigentuemer,
        });
}
