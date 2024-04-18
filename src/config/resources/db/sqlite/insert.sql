-- Inserting data into the 'haus' table
INSERT INTO haus (id, version, hausflaeche, art, preis, verkaeuflich, baudatum, katalog, features, erzeugt, aktualisiert) VALUES
(1, 0, 500, 'REIHENHAUS', 350000.00, 1, '1999-02-01', 'https://haus.de', 'WAERMEPUMPE', '2022-02-01 00:00:00', '2022-02-01 00:00:00'),
(20, 0, 600, 'VILLA', 500000.00, 0, '2011-02-02', 'https://villa.de', 'SMART-TV', '2022-02-02 00:00:00', '2022-02-02 00:00:00'),
(30, 0, 800, 'REIHENHAUS', 700000, 0, '1999-03-02', 'https://www.haus.en', '', '2023-01-04 12:23', '2023-01-04 12:30'),
(40, 0, 900, 'MEHRFAMILIENHAUS', 600000, 1, '2014-03-02', 'https://www.haus.at', 'Garten,Pool', '2021-01-04 10:20', '2021-01-05 10:20'),
(50, 0, 100, 'BUNGALOW', 50000, 1, '2011-04-02', 'https://www.haus.io', 'Gasheizung', '2021-02-03 10:20', '2021-02-06 10:20'),
(60, 0, 990, 'VILLA', 1900000.1, 1, '2010-03-02', 'https://www.haus.com', 'Jacuzzi,Pool', '2024-02-01 00:00', '2024-04-01 00:00');

-- Inserting data into the 'adresse' table
INSERT INTO adresse (id, strasse, hausnummer, plz, haus_id) VALUES
(1, 'Moltkestrasse', '8', '76133', 1),
(20, 'Baumstrasse', '2', '31785', 20),
(30, 'Kaiserstrasse', '9', '76133', 30),
(40, 'Zimmermannstrasse', '23', '42358', 40),
(50, 'Hauptstrasse', '4', '31785', 50),
(60, 'Waldstrasse', '24', '42358', 60);

-- Inserting data into the 'person' table
INSERT INTO person (id, vorname, nachname, eigentuemer, haus_id) VALUES
(1, 'Hung', 'Boisen', 1, 1),
(20, 'Anselm', 'Böhm', 0, 1),
(21, 'Jürgen', 'Zimmermann', 1, 20),
(22, 'Christopher', 'Claus', 1, 30),
(30, 'Peter', 'Maier', 1, 40),
(31, 'Alex', 'Schmidt', 0, 40),
(40, 'Pascal', 'Metzger', 1, 50),
(50, 'Maria', 'Schmitt', 1, 60),
(51, 'Maja', 'Schmitt', 0, 60);
