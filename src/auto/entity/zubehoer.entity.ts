import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Auto } from './auto.entity.js';

@Entity()
export class Zubehoer {
    @PrimaryGeneratedColumn()
    id: number | undefined;

    @Column()
    readonly name!: string;

    @Column('varchar')
    readonly beschreibung: string | undefined;

    @ManyToOne(() => Auto, (auto) => auto.zubehoere)
    @JoinColumn({ name: 'auto_id' })
    auto: Auto | undefined;

    public toString = (): string =>
        JSON.stringify({
            id: this.id,
            name: this.name,
            beschreibung: this.beschreibung,
        });
}
