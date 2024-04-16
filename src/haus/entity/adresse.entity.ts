import {
    Column,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Haus } from './haus.entity.js';

@Entity()
export class Adresse {
    @PrimaryGeneratedColumn()
    id: number | undefined;

    @Column()
    readonly strasse!: string;

    @Column('varchar')
    readonly hausnummer!: string | undefined;

    @Column('varchar')
    readonly plz!: string | undefined;

    @OneToOne(() => Haus, (haus) => haus.adresse)
    @JoinColumn({ name: 'haus_id' })
    haus: Haus | undefined;

    public toString = (): string =>
        JSON.stringify({
            id: this.id,
            strasse: this.strasse,
            hausnummer: this.hausnummer,
            plz: this.plz,
        });
}
