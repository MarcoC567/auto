/* eslint-disable max-classes-per-file */

import {
    IsArray,
    IsBoolean,
    IsISO8601,
    IsInt,
    IsOptional,
    IsPositive,
    Matches,
    Max,
    Min,
    ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { type AutoArt } from '../entity/auto.entity.js';
import { BezeichnungDTO } from './bezeichnungDTO.entity.js';
import { Type } from 'class-transformer';
import { ZubehoerDTO } from './zubehoerDTO.entity.js';

export const MAX_RATING = 5;

/**
 * Entity-Klasse für Autos ohne TypeORM und ohne Referenzen.
 */
export class AutoDtoOhneRef {
    @ApiProperty({ example: 'W0L000051T2123456', type: String })
    readonly fahrgestellnummer!: string;

    @IsInt()
    @Min(0)
    @Max(MAX_RATING)
    @ApiProperty({ example: 5, type: Number })
    readonly rating: number | undefined;

    @Matches(/^SUV$|^LIMOUSINE$/u)
    @IsOptional()
    @ApiProperty({ example: 'SUV', type: String })
    readonly art: AutoArt | undefined;

    @IsPositive()
    @ApiProperty({ example: 1, type: Number })
    // statt number ggf. Decimal aus decimal.js analog zu BigDecimal von Java
    readonly preis!: number;

    @IsBoolean()
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

    // ZubehoerDTO
}
/* eslint-enable max-classes-per-file */
