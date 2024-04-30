import { Auto } from './auto.entity.js';
import { Bezeichnung } from './bezeichnung.entity.js';
import { Zubehoer } from './zubehoer.entity.js';

// erforderlich in src/config/db.ts und src/buch/buch.module.ts
export const entities = [Auto, Bezeichnung, Zubehoer];
