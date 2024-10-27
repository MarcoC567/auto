/**
 * Das Modul besteht aus der Entity-Klasse.
 * @packageDocumentation
 */

/* eslint-disable max-classes-per-file */

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsISO8601,
    IsOptional,
    IsPositive,
    Matches,
    ValidateNested,
} from 'class-validator';
import { type AutoArt } from '../entity/auto.entity.js';
import { BezeichnungDTO } from './bezeichnungDTO.entity.js';
import { ZubehoerDTO } from './zubehoerDTO.entity.js';

export const MAX_RATING = 5;

/**
 * Entity-Klasse für Autos ohne TypeORM und ohne Referenzen.
 */
export class AutoDtoOhneRef {
    // https://www.oreilly.com/library/view/regular-expressions-cookbook/9781449327453/ch04s13.html
    @ApiProperty({ example: 'WAUZZZ4FX9N000100', type: String })
    readonly fahrgestellnummer!: string;

    @Matches(/^(LIMOUSINE|SUV)$/u)
    @IsOptional()
    @ApiProperty({ example: 'SUV', type: String })
    readonly art: AutoArt | undefined;

    @IsPositive()
    @ApiProperty({ example: 1, type: Number })
    readonly preis!: number;

    @IsBoolean()
    @IsOptional()
    @ApiProperty({ example: true, type: Boolean })
    readonly lieferbar: boolean | undefined;

    @IsISO8601({ strict: true })
    @IsOptional()
    @ApiProperty({ example: '2021-01-31' })
    readonly datum: Date | string | undefined;
}
/**
 * Entity-Klasse für Autos ohne TypeORM.
 */
export class AutoDTO extends AutoDtoOhneRef {
    @ValidateNested()
    @Type(() => BezeichnungDTO)
    @ApiProperty({ type: BezeichnungDTO })
    readonly bezeichnung!: BezeichnungDTO; // NOSONAR

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ZubehoerDTO)
    @ApiProperty({ type: [ZubehoerDTO] })
    readonly zubehoere: ZubehoerDTO[] | undefined;
}
/* eslint-enable max-classes-per-file */
