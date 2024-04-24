/**
 * Das Modul besteht aus der Klasse {@linkcode HausReadService}.
 * @packageDocumentation
 */
import { type HausArt } from './../entity/haus.entity.js';

/**
 * Typdefinition für `HausReadService.find()`und `QueryBuilder.build()`
 */
export interface Suchkriterien {
    readonly hausflaeche?: number;
    readonly art?: HausArt;
    readonly preis?: number;
    readonly verkaeuflich?: boolean;
    readonly baudatum?: string;
    readonly katalog?: string;
    readonly waermepumpe?: string;
    readonly pool?: string;
    readonly strasse?: string;
}
