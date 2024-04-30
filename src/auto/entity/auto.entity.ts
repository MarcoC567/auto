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

import { ApiProperty } from '@nestjs/swagger';
import { Bezeichnung } from './bezeichnung.entity.js';
import { DecimalTransformer } from './decimal-transformer.js';
import { Zubehoer } from './zubehoer.entity.js';
import { dbType } from '../../config/db.js';

/**
 * Alias-Typ für gültige Strings bei der Art eines Autos.
 */
export type AutoArt = 'SUV' | 'LIMOUSINE';

/**
 * Entity-Klasse zu einer relationalen Tabelle
 */
@Entity()
export class Auto {
    @PrimaryGeneratedColumn()
    id: number | undefined;

    @VersionColumn()
    readonly version: number | undefined;

    @Column()
    @ApiProperty({ example: 'W0L000051T2123456', type: String })
    readonly fahrgestellnummer!: string;

    @Column('varchar')
    @ApiProperty({ example: 'SUV', type: String })
    readonly art: AutoArt | undefined;

    @Column('decimal', {
        precision: 8,
        scale: 2,
        transformer: new DecimalTransformer(),
    })
    @ApiProperty({ example: 1, type: Number })
    readonly preis!: number;

    @Column('decimal')
    @ApiProperty({ example: true, type: Boolean })
    readonly lieferbar: boolean | undefined;

    @Column('date')
    @ApiProperty({ example: '2021-01-31' })
    readonly datum: Date | string | undefined;

    @OneToOne(() => Bezeichnung, (bezeichnung) => bezeichnung.auto, {
        cascade: ['insert', 'remove'],
    })
    readonly bezeichnung: Bezeichnung | undefined;

    @OneToMany(() => Zubehoer, (zubehoer) => zubehoer.auto, {
        cascade: ['insert', 'remove'],
    })
    readonly zubehoere: Zubehoer[] | undefined;

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
            fahrgestellnummer: this.fahrgestellnummer,
            art: this.art,
            preis: this.preis,
            lieferbar: this.lieferbar,
            datum: this.datum,
            erzeugt: this.erzeugt,
            aktualisiert: this.aktualisiert,
        });
}
