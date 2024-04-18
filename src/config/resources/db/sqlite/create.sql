CREATE TABLE IF NOT EXISTS haus (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    version       INTEGER NOT NULL DEFAULT 0,
    hausflaeche   INTEGER NOT NULL,
    art           TEXT CHECK(art IN ('BUNGALOW', 'MEHRFAMILIENHAUS', 'REIHENHAUS', 'VILLA')),
    preis         REAL NOT NULL,
    verkaeuflich  BOOLEAN NOT NULL DEFAULT 0,
    baudatum      DATE,
    katalog       TEXT,
    features      TEXT,
    erzeugt       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    aktualisiert  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS adresse (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    strasse     TEXT NOT NULL,
    hausnummer  TEXT NOT NULL,
    plz         TEXT NOT NULL,
    haus_id     INTEGER NOT NULL UNIQUE REFERENCES haus(id)
);

CREATE TABLE IF NOT EXISTS person (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    vorname         TEXT NOT NULL,
    nachname        TEXT NOT NULL,
    eigentuemer     BOOLEAN NOT NULL DEFAULT 0,
    haus_id         INTEGER NOT NULL REFERENCES haus(id)
);

CREATE INDEX IF NOT EXISTS person_haus_id_idx ON person(haus_id);
