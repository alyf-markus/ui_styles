---
title: Seiteneinstellungen
order: 20
roles:
  - System Manager
---

# Seiteneinstellungen

Öffnen Sie **Remix-Einstellungen** über den Arbeitsbereich **UI Styles** (System-Manager).

| Feld | fieldname | Zweck |
| --- | --- | --- |
| *Remix aktivieren* | `enabled` | Hauptschalter. Aus: `/desk` unverändert, `/remix` leitet auf `/desk`. An: `/desk` zeigt einen Remix-Link und `/remix` lädt die Schale. Standard nach Installation: aus. |
| *Verlauf* | `history` | Uhren-Menü in der regulären Frappe-Navbar mit den letzten 10 eindeutigen Seiten. Standard: aus. |
| *Favoriten* | `favorites` | Lesezeichen-Stern in der regulären Frappe-Navbar: aktuelle Seite (Listen, Berichte, Belege) merken und später aus dem Dropdown öffnen. Wenn Alternative Navigation an ist, können Apps im Wechsler mit Stern markiert werden. Standard: aus. |
| *Alternative Navigation* | `alternative_navigation` | Frappe-Seitenleiste durch Remix-App-Wechsler und Menü ersetzen. Standard: aus. |
| *Suche* | `search` | Awesome Bar oben in der Remix-Seitenleiste, über dem App-Wechsler. Die Checkbox _In Belegen suchen_ darunter schaltet auf Ergebnisse der globalen Suche (Kunden, Belege, ...) um, sodass Enter direkt den ersten Treffer öffnet; die Wahl wird pro Browser gemerkt. Nur sichtbar, wenn Alternative Navigation an ist. Standard: aus. |
| *Farben* | `colors` | Jeder Benutzer kann ein Desk-Colour-Thema (dieselben Themen wie **Desk-Hintergrund**) für den Desk-Hintergrund und die Remix-Seitenleiste wählen. Ohne Auswahl gelten die Systemfarben bzw. die Site-Einstellung von **Desk-Hintergrund**; ein gewähltes Remix-Thema hat für diesen Benutzer Vorrang. Standard: aus. |
| *Manuelle Farben* | `manual_colors` | Zusätzlich Hex-Farben (Benutzerdefiniert: _Hintergrund_ und _Seitenleiste_) statt eines Desk-Colour-Themas. Nur sichtbar, wenn Farben an ist. Standard: aus. |

Wenn *Remix aktivieren* an ist, muss mindestens *Verlauf*, *Favoriten* oder *Alternative Navigation* an sein.

Beim Speichern von **Remix-Einstellungen** wird der Cache geleert. Desk hart neu laden, um Änderungen anzuwenden.
