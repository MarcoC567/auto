import {
    Column,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Auto } from './auto.entity.js';

@Entity()
export class Bezeichnung {
    @PrimaryGeneratedColumn()
    id: number | undefined;

    @Column()
    readonly bezeichnung!: string;

    @Column({ type: 'varchar' })
    readonly zusatz: string | undefined;

    @OneToOne(() => Auto, (auto) => auto.bezeichnung)
    @JoinColumn({ name: 'auto_id' })
    auto: Auto | undefined;

    public toString = (): string =>
        JSON.stringify({
            id: this.id,
            bezeichnung: this.bezeichnung,
            zusatz: this.zusatz,
        });
}
