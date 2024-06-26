CREATE SCHEMA IF NOT EXISTS AUTHORIZATION haus;

ALTER ROLE haus SET search_path = 'haus';

CREATE TYPE hausart AS ENUM ('BUNGALOW', 'MEHRFAMILIENHAUS', 'REIHENHAUS', 'VILLA');

CREATE TABLE IF NOT EXISTS haus (
    id            integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY USING INDEX TABLESPACE hausspace,
    version       integer NOT NULL DEFAULT 0,
    hausflaeche   integer NOT NULL,
    art           hausart,
    preis         decimal(10,2) NOT NULL,
    verkaeuflich  boolean NOT NULL DEFAULT FALSE,
    baudatum      date,
    katalog       varchar(40),
    features      varchar(64),
    erzeugt       timestamp NOT NULL DEFAULT NOW(),
    aktualisiert  timestamp NOT NULL DEFAULT NOW()
) TABLESPACE hausspace;

CREATE TABLE IF NOT EXISTS adresse (
    id          integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY USING INDEX TABLESPACE hausspace,
    strasse     varchar(40) NOT NULL,
    hausnummer  varchar(10) NOT NULL,
    plz         varchar(5) NOT NULL,
    haus_id     integer NOT NULL UNIQUE USING INDEX TABLESPACE hausspace REFERENCES haus
) TABLESPACE hausspace;


CREATE TABLE IF NOT EXISTS person (
    id              integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY USING INDEX TABLESPACE hausspace,
    vorname         varchar(32) NOT NULL,
    nachname        varchar(32) NOT NULL,
    eigentuemer     boolean NOT NULL DEFAULT FALSE,
    haus_id         integer NOT NULL REFERENCES haus
) TABLESPACE hausspace;
CREATE INDEX IF NOT EXISTS person_haus_id_idx ON person(haus_id) TABLESPACE hausspace;
