import { Person } from './person.entity.js';
import { Haus } from './haus.entity.js';
import { Adresse } from './adresse.entity.js';

// erforderlich in src/config/db.ts und src/haus/haus.module.ts
export const entities = [Person, Haus, Adresse];
