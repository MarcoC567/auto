/**
 * Das Modul besteht aus der Entity-Klasse.
 * @packageDocumentation
 */

/* eslint-disable @typescript-eslint/no-magic-numbers */

import { ApiProperty } from '@nestjs/swagger';

import { IsOptional, MaxLength } from 'class-validator';

/**
 * Entity-Klasse für Zubehoer ohne TypeORM.
 */
export class ZubehoerDTO {
    @MaxLength(32)
    @ApiProperty({ example: 'Der Name', type: String })
    readonly name!: string;

    @IsOptional()
    @MaxLength(32)
    @ApiProperty({ example: 'Die Beschreibung', type: String })
    readonly beschreibung: string | undefined;
}
/* eslint-enable @typescript-eslint/no-magic-numbers */
