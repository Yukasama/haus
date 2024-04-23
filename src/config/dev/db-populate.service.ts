/**
 * Das Modul enthält die Funktion, um die Test-DB neu zu laden.
 * @packageDocumentation
 */

import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import {
    adminDataSourceOptions,
    dbPopulate,
    dbResourcesDir,
    typeOrmModuleOptions,
} from '../typeormOptions.js';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { dbType } from '../db.js';
import { getLogger } from '../../logger/logger.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Die Test-DB wird im Development-Modus neu geladen, nachdem die Module
 * initialisiert sind, was durch `OnApplicationBootstrap` realisiert wird.
 *
 * DB-Migration mit TypeORM (ohne Nest): https://typeorm.io/migrations
 */
@Injectable()
export class DbPopulateService implements OnApplicationBootstrap {
    readonly #tabellen = ['haus', 'adresse', 'person'];

    readonly #datasource: DataSource;

    readonly #resourcesDir = dbResourcesDir;

    readonly #logger = getLogger(DbPopulateService.name);

    readonly #oracleInsertHaus = `
        INSERT INTO haus(id,version,hausflaeche,art,preis,verkaeuflich,baudatum,katalog,features,erzeugt,aktualisiert)
        SELECT id,version,hausflaeche,art,preis,verkaeuflich,baudatum,katalog,features,erzeugt,aktualisiert
        FROM   EXTERNAL (
            (id           NUMBER(10,0),
            version       NUMBER(3,0),
            hausflaeche   NUMBER(3,0),
            art           VARCHAR2(20),
            preis         NUMBER(10,2),
            verkaeuflich  NUMBER(1,0),
            baudatum      DATE,
            katalog       VARCHAR2(40),
            features      VARCHAR2(64),
            erzeugt       TIMESTAMP,
            aktualisiert  TIMESTAMP)
            TYPE ORACLE_LOADER
            DEFAULT DIRECTORY csv_dir
            ACCESS PARAMETERS (
                RECORDS DELIMITED BY NEWLINE
                SKIP 1
                FIELDS TERMINATED BY ';'
                (id,version,hausflaeche,art,preis,verkaeuflich,
                 baudatum DATE 'YYYY-MM-DD',
                 katalog,features,
                 erzeugt CHAR(19) date_format TIMESTAMP mask 'YYYY-MM-DD HH24:MI:SS',
                 aktualisiert CHAR(19) date_format TIMESTAMP mask 'YYYY-MM-DD HH24:MI:SS')
            )
            LOCATION ('haus.csv')
            REJECT LIMIT UNLIMITED
        ) haus_external
    `;

    readonly #oracleInsertAdresse = `
        INSERT INTO adresse(id,strasse,hausnummer,plz,haus_id)
        SELECT id,strasse,hausnummer,plz,haus_id
        FROM   EXTERNAL (
            (id         NUMBER(10,0),
            strasse     VARCHAR2(40),
            hausnummer  VARCHAR2(10),
            plz         VARCHAR2(5),
            haus_id     NUMBER(10,0))
            TYPE ORACLE_LOADER
            DEFAULT DIRECTORY csv_dir
            ACCESS PARAMETERS (
                RECORDS DELIMITED BY NEWLINE
                SKIP 1
                FIELDS TERMINATED BY ';')
            LOCATION ('adresse.csv')
            REJECT LIMIT UNLIMITED
        ) adresse_external
    `;

    readonly #oracleInsertPerson = `
        INSERT INTO person(id,vorname,nachname,eigentuemer,haus_id)
        SELECT id,vorname,nachname,eigentuemer,haus_id
        FROM   EXTERNAL (
            (id         NUMBER(10,0),
            vorname     VARCHAR2(32),
            nachname    VARCHAR2(32),
            eigentuemer NUMBER(1,0),
            haus_id     NUMBER(10,0))
            TYPE ORACLE_LOADER
            DEFAULT DIRECTORY csv_dir
            ACCESS PARAMETERS (
                RECORDS DELIMITED BY NEWLINE
                SKIP 1
                FIELDS TERMINATED BY ';')
            LOCATION ('person.csv')
            REJECT LIMIT UNLIMITED
        ) person_external
    `;

    /**
     * Initialisierung durch DI mit `DataSource` für SQL-Queries.
     */
    constructor(@InjectDataSource() dataSource: DataSource) {
        this.#datasource = dataSource;
    }

    /**
     * Die Test-DB wird im Development-Modus neu geladen.
     */
    async onApplicationBootstrap() {
        await this.populateTestdaten();
    }

    async populateTestdaten() {
        if (!dbPopulate) {
            return;
        }

        this.#logger.warn(`${typeOrmModuleOptions.type}: DB wird neu geladen`);
        switch (dbType) {
            case 'postgres': {
                await this.#populatePostgres();
                break;
            }
            case 'mysql': {
                await this.#populateMySQL();
                break;
            }
            case 'oracle': {
                await this.#populateOracle();
                break;
            }
            case 'sqlite': {
                await this.#populateSQLite();
                break;
            }
        }
        this.#logger.warn('DB wurde neu geladen');
    }

    async #populatePostgres() {
        const dropScript = resolve(this.#resourcesDir, 'drop.sql');
        this.#logger.debug('dropScript = %s', dropScript); // eslint-disable-line sonarjs/no-duplicate-string
        const dropStatements = readFileSync(dropScript, 'utf8'); // eslint-disable-line security/detect-non-literal-fs-filename,n/no-sync
        await this.#datasource.query(dropStatements);

        const createScript = resolve(this.#resourcesDir, 'create.sql'); // eslint-disable-line sonarjs/no-duplicate-string
        this.#logger.debug('createScript = %s', createScript); // eslint-disable-line sonarjs/no-duplicate-string
        const createStatements = readFileSync(createScript, 'utf8'); // eslint-disable-line security/detect-non-literal-fs-filename,n/no-sync
        await this.#datasource.query(createStatements);

        const dataSource = new DataSource(adminDataSourceOptions!);
        await dataSource.initialize();
        await dataSource.query(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `SET search_path TO ${adminDataSourceOptions!.database};`,
        );
        const copyStmt =
            // eslint-disable-next-line @stylistic/quotes
            "COPY %TABELLE% FROM '/csv/%TABELLE%.csv' (FORMAT csv, DELIMITER ';', HEADER true);";
        for (const tabelle of this.#tabellen) {
            // eslint-disable-next-line unicorn/prefer-string-replace-all
            await dataSource.query(copyStmt.replace(/%TABELLE%/gu, tabelle));
        }
        await dataSource.destroy();
    }

    async #populateMySQL() {
        const dropScript = resolve(this.#resourcesDir, 'drop.sql');
        this.#logger.debug('dropScript = %s', dropScript);
        await this.#executeStatements(dropScript);

        const createScript = resolve(this.#resourcesDir, 'create.sql');
        this.#logger.debug('createScript = %s', createScript);
        await this.#executeStatements(createScript);

        const dataSource = new DataSource(adminDataSourceOptions!);
        await dataSource.initialize();
        await dataSource.query(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `USE ${adminDataSourceOptions!.database};`,
        );
        const copyStmt =
            // eslint-disable-next-line @stylistic/quotes
            "LOAD DATA INFILE '/var/lib/mysql-files/%TABELLE%.csv' " +
            // eslint-disable-next-line @stylistic/quotes
            "INTO TABLE %TABELLE% FIELDS TERMINATED BY ';' " +
            // eslint-disable-next-line @stylistic/quotes
            "ENCLOSED BY '\"' LINES TERMINATED BY '\\n' IGNORE 1 ROWS;";
        for (const tabelle of this.#tabellen) {
            // eslint-disable-next-line unicorn/prefer-string-replace-all
            await dataSource.query(copyStmt.replace(/%TABELLE%/gu, tabelle));
        }
        await dataSource.destroy();
    }

    async #populateOracle() {
        const dropScript = resolve(this.#resourcesDir, 'drop.sql');
        this.#logger.debug('dropScript = %s', dropScript);
        await this.#executeStatements(dropScript, true);

        const createScript = resolve(this.#resourcesDir, 'create.sql');
        this.#logger.debug('createScript = %s', createScript);
        await this.#executeStatements(createScript, true);

        await this.#oracleInsert(this.#oracleInsertHaus);
        await this.#oracleInsert(this.#oracleInsertAdresse);
        await this.#oracleInsert(this.#oracleInsertPerson);
    }

    async #populateSQLite() {
        const dropScript = resolve(this.#resourcesDir, 'drop.sql');
        await this.#executeStatements(dropScript);

        const createScript = resolve(this.#resourcesDir, 'create.sql');
        await this.#executeStatements(createScript);

        const insertScript = resolve(this.#resourcesDir, 'insert.sql');
        await this.#executeStatements(insertScript);
    }

    async #executeStatements(script: string, removeSemi = false) {
        const statements: string[] = [];
        let statement = '';
        readFileSync(script, 'utf8') // eslint-disable-line security/detect-non-literal-fs-filename,n/no-sync
            .split(/\r?\n/u)
            .filter((line) => !line.includes('--'))
            .forEach((line) => {
                statement += line;
                if (line.endsWith(';')) {
                    if (removeSemi) {
                        statements.push(statement.slice(0, -1));
                    } else {
                        statements.push(statement);
                    }
                    statement = '';
                }
            });

        for (statement of statements) {
            await this.#datasource.query(statement);
        }
    }

    async #oracleInsert(statement: string) {
        let singleLine = '';
        statement.split(/\r?\n/u).forEach((line) => {
            singleLine += line;
        });
        await this.#datasource.query(singleLine);
    }
}
