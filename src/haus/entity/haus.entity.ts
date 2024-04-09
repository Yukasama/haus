/**
 * Das Modul besteht aus der Entity-Klasse.
 * @packageDocumentation
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { Adresse } from './adresse.entity.js';
import { ApiProperty } from '@nestjs/swagger';
import { DecimalTransformer } from './decimal-transformer.js';
import { Person } from './person.entity.js';
import { dbType } from '../../config/db.js';

/**
 * Alias-Typ für gültige Strings bei der Art eines Hauses.
 */
export type HausArt = 'BUNGALOW' | 'MEHRFAMILIENHAUS' | 'REIHENHAUS' | 'VILLA';

/**
 * Entity-Klasse zu einem Haus
 */
@Entity()
export class Haus {
  @PrimaryGeneratedColumn()
  id: number | undefined;

  @VersionColumn()
  readonly version: number | undefined;

  @Column('int')
  @ApiProperty({ example: 5, type: Number })
  readonly hausflaeche: number | undefined;

  @Column('varchar')
  @ApiProperty({ example: 'BUNGALOW', type: String })
  readonly art: HausArt | undefined;

  @Column('decimal', {
    precision: 10,
    scale: 2,
    transformer: new DecimalTransformer(),
  })
  @ApiProperty({ example: 100, type: Number })
  readonly preis!: number;

  @Column('decimal')
  @ApiProperty({ example: true, type: Boolean })
  readonly zumVerkauf: boolean | undefined;

  @Column('date')
  @ApiProperty({ example: '2021-01-31' })
  readonly baudatum: Date | string | undefined;

  @Column('varchar')
  @ApiProperty({ example: 'https://www.haus.de/', type: String })
  readonly katalog: string | undefined;

  @Column('simple-array')
  features: string[] | null | undefined;

  @OneToOne(() => Adresse, (adresse: Adresse) => adresse.haus, {
    cascade: ['insert', 'remove'],
  })
  readonly adresse: Adresse | undefined;

  @OneToMany(() => Person, (person: Person) => person.haus, {
    cascade: ['insert', 'remove'],
  })
  readonly personen: Person[] | undefined;

  @CreateDateColumn({
    type: dbType === 'sqlite' ? 'datetime' : 'timestamp',
  })
  readonly erzeugt: Date | undefined;

  @UpdateDateColumn({
    type: dbType === 'sqlite' ? 'datetime' : 'timestamp',
  })
  readonly aktualisiert: Date | undefined;

  public toString = (): string =>
    JSON.stringify({
      id: this.id,
      version: this.version,
      art: this.art,
      preis: this.preis,
      zumVerkauf: this.zumVerkauf,
      baudatum: this.baudatum,
      katalog: this.katalog,
      features: this.features,
      erzeugt: this.erzeugt,
      aktualisiert: this.aktualisiert,
    });
}
