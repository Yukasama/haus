import { type HausArt } from './../entity/haus.entity.js';

export interface Suchkriterien {
    readonly hausflaeche?: number;
    readonly art?: HausArt;
    readonly preis?: number;
    readonly verkaeuflich?: boolean;
    readonly baudatum?: string;
    readonly katalog?: string;
    readonly javascript?: string;
    readonly typescript?: string;
    readonly adresse?: string;
}
