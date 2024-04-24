-- Copyright (C) 2023 - present Juergen Zimmermann, Hochschule Karlsruhe
--
-- This program is free software: you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation, either version 3 of the License, or
-- (at your option) any later version.
--
-- This program is distributed in the hope that it will be useful,
-- but WITHOUT ANY WARRANTY; without even the implied warranty of
-- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
-- GNU General Public License for more details.
--
-- You should have received a copy of the GNU General Public License
-- along with this program.  If not, see <https://www.gnu.org/licenses/>.

-- "Konzeption und Realisierung eines aktiven Datenbanksystems"
-- "Verteilte Komponenten und Datenbankanbindung"
-- "Design Patterns"
-- "Freiburger Chorbuch"
-- "Maschinelle Lernverfahren zur Behandlung von Bonitätsrisiken im Mobilfunkgeschäft"
-- "Software Pioneers"

INSERT INTO auto(id, version, fahrgestellnummer, art, preis, lieferbar, datum, erzeugt, aktualisiert) VALUES
    (1,0,'978-3-897-22583-1','SUV',11000,true,'2022-02-01','2022-02-01 00:00:00','2022-02-01 00:00:00');
INSERT INTO auto(id, version, fahrgestellnummer, art, preis, rabatt, lieferbar, datum, homepage, schlagwoerter, erzeugt, aktualisiert) VALUES
    (20,0,'978-3-827-31552-6','SUV',8000,true,'2022-02-02','2022-02-02 00:00:00','2022-02-02 00:00:00');
INSERT INTO auto(id, version, fahrgestellnummer, art, preis, rabatt, lieferbar, datum, homepage, schlagwoerter, erzeugt, aktualisiert) VALUES
    (30,0,'978-0-201-63361-0','LIMOUSINE',45000,true,'2022-02-03','2022-02-03 00:00:00','2022-02-03 00:00:00');
INSERT INTO auto(id, version, fahrgestellnummer, art, preis, rabatt, lieferbar, datum, homepage, schlagwoerter, erzeugt, aktualisiert) VALUES
    (40,0,'978-0-007-09732-6','SUV',22000,true,'2022-02-04','2022-02-04 00:00:00','2022-02-04 00:00:00');
INSERT INTO auto(id, version, fahrgestellnummer, art, preis, rabatt, lieferbar, datum, homepage, schlagwoerter, erzeugt, aktualisiert) VALUES
    (50,0,'978-3-824-40481-0','LIMOUSINE',86400,true,'2022-02-05','2022-02-05 00:00:00','2022-02-05 00:00:00');
INSERT INTO auto(id, version, fahrgestellnummer, art, preis, rabatt, lieferbar, datum, homepage, schlagwoerter, erzeugt, aktualisiert) VALUES
    (60,0,'978-3-540-43081-0','LIMOUSINE',12240,true,'2022-02-06','2022-02-06 00:00:00','2022-02-06 00:00:00');

INSERT INTO bezeichnung(id, bezeichnung, zusatz, auto_id) VALUES
    (1,'Alpha','alpha',1);
INSERT INTO bezeichnung(id, bezeichnung, zusatz, auto_id) VALUES
    (20,'Beta',null,20);
INSERT INTO bezeichnung(id, bezeichnung, zusatz, auto_id) VALUES
    (30,'Gamma','gamma',30);
INSERT INTO bezeichnung(id, bezeichnung, zusatz, auto_id) VALUES
    (40,'Delta','delta',40);
INSERT INTO bezeichnung(id, bezeichnung, zusatz, auto_id) VALUES
    (50,'Epsilon','epsilon',50);
INSERT INTO bezeichnung(id, bezeichnung, zusatz, auto_id) VALUES
    (60,'Phi','phi',60);

INSERT INTO zubehoer(id, name, beschreibung, auto_id) VALUES
    (1,'Abb. 1','img/png',1);
INSERT INTO zubehoer(id, name, beschreibung, auto_id) VALUES
    (20,'Abb. 1','img/png',20);
INSERT INTO zubehoer(id, name, beschreibung, auto_id) VALUES
    (21,'Abb. 2','img/png',20);
INSERT INTO zubehoer(id, name, beschreibung, auto_id) VALUES
    (30,'Abb. 1','img/png',30);
INSERT INTO zubehoer(id, name, beschreibung, auto_id) VALUES
    (31,'Abb. 2','img/png',30);
INSERT INTO zubehoer(id, name, beschreibung, auto_id) VALUES
    (40,'Abb. 1','img/png',40);
INSERT INTO zubehoer(id, name, beschreibung, auto_id) VALUES
    (50,'Abb. 1','img/png',50);
INSERT INTO zubehoer(id, name, beschreibung, auto_id) VALUES
    (60,'Abb. 1','img/png',60);
