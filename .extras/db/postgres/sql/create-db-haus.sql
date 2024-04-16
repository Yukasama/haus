-- https://www.postgresql.org/docs/current/sql-createrole.html
CREATE ROLE haus LOGIN PASSWORD 'p';

-- https://www.postgresql.org/docs/current/sql-createdatabase.html
CREATE DATABASE haus;

GRANT ALL ON DATABASE haus TO haus;

-- https://www.postgresql.org/docs/10/sql-createtablespace.html
CREATE TABLESPACE hausspace OWNER haus LOCATION '/var/lib/postgresql/tablespace/haus';
