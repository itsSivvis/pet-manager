<p align="center">
  <img src="client/public/pwa-192.png" width="96" height="96" alt="" />
</p>

<h1 align="center">Pet Manager</h1>

<p align="center">
  Selbst gehostete Haustierverwaltung für deinen Haushalt – oder mehrere: Gesundheitsdaten,
  Medikamentenpläne mit Push-Erinnerungen, Termine, Futterpläne, Vorsorge und
  Krankheitsverläufe – in einer freundlichen, installierbaren Web-App.
</p>

<p align="center">
  <a href="https://github.com/itsSivvis/pet-manager/actions/workflows/ci.yml"><img src="https://github.com/itsSivvis/pet-manager/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT-Lizenz" /></a>
  <a href="README.md">🇬🇧 English</a>
</p>

---

## Screenshots

Drei eingebaute Designs (plus das klassische _Wiese_), zur Laufzeit umschaltbar:

| Neutral Hell                                                                      | Neutral Dunkel                                                                      | Verspielt                                                                |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| ![Übersicht – Neutral Hell](docs/screenshots/neutral-light/desktop-dashboard.png) | ![Übersicht – Neutral Dunkel](docs/screenshots/neutral-dark/desktop-dashboard.png)  | ![Übersicht – Verspielt](docs/screenshots/playful/desktop-dashboard.png) |
| ![Mobil – Neutral Hell](docs/screenshots/neutral-light/mobile-pet-overview.png)   | ![Mobil – Neutral Dunkel](docs/screenshots/neutral-dark/mobile-pet-medications.png) | ![Mobil – Verspielt](docs/screenshots/playful/mobile-illness.png)        |

Weitere Screenshots (jede Seite, jedes Design, Mobil und Desktop) liegen in [`docs/screenshots`](docs/screenshots).

## Funktionen

- 🐾 **Tiere** – Profil mit Foto, Tierart, Rasse, Geburtstag, Chipnummer; Archivieren statt Löschen.
- 🩺 **Gesundheitseinträge** – Gewicht (mit Diagramm), Tierarztbesuche, Impfungen, Beobachtungen.
- 💊 **Medikamente** – Uhrzeiten, alle _n_ Tage, Beginn/Ende; Gaben abhaken (mit Rückgängig), Bestandsführung und Warnung bei knappem Bestand.
- 📅 **Termine** mit Erinnerung, 🥣 **Futterpläne**, 🛡️ **Vorsorge** (Entwurmung, Floh & Zecke, Impfungen …) mit Fälligkeiten.
- 📈 **Krankheitsverläufe** – tägliche Einträge mit Schweregrad und Temperatur, „wie letzter Eintrag", **PDF-Export** mit Vorschau.
- 🏠 **Übersicht** – heute fällige Gaben, anstehende Termine, fällige Vorsorge, offene Punkte.
- 🔔 **Push-Erinnerungen** über [ntfy](https://ntfy.sh) (selbst hostbar), auf Deutsch oder Englisch – pro Haushalt eingestellt.
- 🎨 **Designs** – Neutral Hell, Neutral Dunkel, Verspielt und Wiese; folgt standardmäßig der Hell-/Dunkel-Einstellung des Systems. WCAG-AA-Kontraste werden per Test geprüft.
- 🌍 **Deutsch und Englisch**, weitere Sprachen lassen sich leicht ergänzen.
- 📱 **Installierbare PWA**, Mobile-first, Pull-to-Refresh.
- 👥 **Mehrere Nutzer pro Haushalt** – alle im Haushalt teilen sich dieselben Tiere; Familienmitglieder per Link einladen.
- 🏘️ **Mehrere Haushalte pro Instanz** – mehrere Familien auf einem Server, jeweils mit getrennten Tieren, Einträgen und Benachrichtigungen; Admin-Bereich für Nutzer, Haushalte und Katalog.
- 🔒 **Datenschutzfreundlich** – deine Daten bleiben auf deinem Server; keine Tracker, keine externen CDNs (Schriften sind selbst gehostet).

## Schnellstart (Docker)

Voraussetzung: Docker mit Compose-Plugin.

```bash
git clone https://github.com/itsSivvis/pet-manager.git && cd pet-manager && ./scripts/init-env.sh && docker compose up -d
```

`init-env.sh` legt eine `.env` mit zufälligem `JWT_SECRET` und Datenbank-Passwort an.
Danach **http://localhost:3000** öffnen und das erste Konto anlegen – es wird Administrator.

> Die App lauscht nur auf `127.0.0.1:3000`. Für andere Geräte einen Reverse
> Proxy mit HTTPS davorschalten (siehe unten).

Sofort etwas sehen? Fiktive Demo-Tiere laden:

```bash
docker compose exec app node server/src/db/cli.js seed
```

## Manuelle Installation (ohne Docker)

Voraussetzungen: Node.js 22+, PostgreSQL 14+ (empfohlen 16).

```bash
git clone https://github.com/itsSivvis/pet-manager.git && cd pet-manager
npm ci
npm run build                                   # baut die Web-App nach client/dist

# Datenbank und Nutzer anlegen, z. B.:
#   CREATE ROLE petmanager LOGIN PASSWORD '…'; CREATE DATABASE petmanager OWNER petmanager;

export NODE_ENV=production
export JWT_SECRET="$(openssl rand -hex 32)"     # dauerhaft speichern, z. B. in einer systemd-Unit
export DATABASE_URL=postgres://petmanager:…@localhost:5432/petmanager
export STATIC_DIR="$PWD/client/dist" UPLOAD_DIR=/var/lib/pet-manager/uploads TZ=Europe/Berlin
npm start                                       # migriert die Datenbank und lauscht auf :3000
```

Für die Entwicklung siehe [CONTRIBUTING.md](CONTRIBUTING.md) (englisch).

## Konfiguration

Alle Einstellungen sind Umgebungsvariablen (siehe die kommentierte [`.env.example`](.env.example)).
Anmeldepflicht, Registrierung, Nutzer und Haushalte werden in der Web-Oberfläche unter **Administration** eingestellt;
Push-Benachrichtigungen und Einladungslinks pro Haushalt unter **Einstellungen**.

| Variable                        | Standard                                                     | Beschreibung                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `JWT_SECRET`                    | – (**in Produktion Pflicht**)                                | Geheimnis zum Signieren der Login-Tokens, ≥ 32 zufällige Zeichen (`openssl rand -hex 32`). Ohne startet der Server nicht.               |
| `DATABASE_URL`                  | `postgres://petmanager:petmanager@localhost:5432/petmanager` | PostgreSQL-Verbindung. In `docker-compose.yml` automatisch gesetzt.                                                                     |
| `POSTGRES_PASSWORD`             | – (für Compose Pflicht)                                      | Passwort des Datenbank-Containers.                                                                                                      |
| `POSTGRES_USER` / `POSTGRES_DB` | `petmanager`                                                 | Datenbank-Nutzer/-Name für Compose.                                                                                                     |
| `PORT`                          | `3000`                                                       | Port, auf dem der Server lauscht.                                                                                                       |
| `APP_PORT`                      | `3000`                                                       | Von Compose veröffentlichter Host-Port (an `127.0.0.1` gebunden).                                                                       |
| `TZ`                            | `UTC`                                                        | Zeitzone für Medikamentenzeiten, „heute" und Erinnerungen (z. B. `Europe/Berlin`).                                                      |
| `DEFAULT_LOCALE`                | `en`                                                         | Sprache der Push-Benachrichtigungen, falls nicht für den Haushalt gesetzt (`en`, `de`).                                                 |
| `CLIENT_URL`                    | –                                                            | Erlaubte CORS-Origin(s), kommagetrennt. Nur nötig, wenn die Web-App von einer anderen Origin ausgeliefert wird (z. B. Vite-Dev-Server). |
| `TRUST_PROXY`                   | `0`                                                          | Anzahl der Reverse Proxies vor der App (`1` hinter Caddy/nginx/Traefik) – nötig für korrekte Client-IPs beim Rate Limiting.             |
| `JWT_EXPIRES_IN`                | `7d`                                                         | Gültigkeit einer Anmeldung.                                                                                                             |
| `AUTH_RATE_LIMIT`               | `10`                                                         | Fehlgeschlagene Anmelde-/Registrierungsversuche pro IP und 15 Minuten.                                                                  |
| `API_RATE_LIMIT`                | `1000`                                                       | API-Anfragen pro IP und Minute (alle Endpunkte).                                                                                        |
| `UPLOAD_DIR`                    | `server/uploads` (`/data/uploads` in Docker)                 | Speicherort der Tierfotos.                                                                                                              |
| `MAX_UPLOAD_MB`                 | `5`                                                          | Maximale Fotogröße.                                                                                                                     |
| `STATIC_DIR`                    | – (`/app/client/dist` in Docker)                             | Verzeichnis der gebauten Web-App, die der Server ausliefert.                                                                            |
| `REMINDERS_ENABLED`             | `true`                                                       | Erinnerungs-Scheduler abschalten (z. B. auf weiteren Replikas).                                                                         |
| `REMINDER_INTERVAL_SECONDS`     | `60`                                                         | Prüfintervall für Erinnerungen.                                                                                                         |
| `ALLOW_ANONYMOUS_MODE`          | `false`                                                      | ⚠️ Erlaubt einem Admin, die Anmeldepflicht abzuschalten – siehe [Sicherheit](#sicherheit).                                              |
| `PET_MANAGER_IMAGE`             | `ghcr.io/itssivvis/pet-manager:latest`                       | Von Compose verwendetes Image.                                                                                                          |

### Push-Benachrichtigungen (ntfy)

1. Die [ntfy-App](https://ntfy.sh) installieren und ein Topic mit schwer zu erratendem Namen abonnieren (z. B. `pets-7f3a9c`) – oder einen eigenen ntfy-Server nutzen.
2. In Pet Manager unter **Einstellungen → Push-Benachrichtigungen** die Server-URL (`https://ntfy.sh` oder z. B. `https://ntfy.example.com`), das Topic und – bei geschützten Topics – ein Zugriffstoken eintragen.
3. **Testbenachrichtigung senden** klicken.

Jeder Haushalt hat eigene ntfy-Einstellungen, jede Familie bekommt also nur die Erinnerungen für ihre eigenen Tiere.
Erinnert wird an fällige Medikamentengaben (nicht, wenn schon abgehakt), Termine (Vorlauf einstellbar), heute fällige Vorsorge (ab 09:00) und knappen Bestand.

## Haushalte

Eine Instanz kann mehrere Haushalte beherbergen (z. B. Familien, Nachbarn, eine
Tiersitterin und ihre Kundschaft). Jeder Haushalt hat eigene Tiere samt aller
Einträge, eine eigene Übersicht und eigene Push-Benachrichtigungen. Andere
Haushalte – auch deren Administratoren – sehen sie in der App nicht.

- **Einrichtung:** Das erste Konto legt den ersten Haushalt an (der Name lässt sich bei der Einrichtung vergeben).
- **Familienmitglieder hinzufügen:** Unter **Einstellungen → Haushalt → Jemanden einladen** einen
  Einladungslink erstellen und verschicken. Wer ihn öffnet, registriert sich direkt in deinem
  Haushalt – auch wenn die offene Registrierung geschlossen ist. Ein neuer Link macht den alten
  ungültig; nicht mehr benötigte Links deaktivieren.
- **Neue Familien:** Ein Admin schaltet entweder **Neue Registrierungen erlauben** ein (jedes neue
  Konto bekommt dann einen eigenen, leeren Haushalt) oder legt unter **Administration → Haushalte**
  einen Haushalt an und verschickt dessen Einladungslink.
- **Konten verschieben:** Admins können Nutzer unter **Administration → Benutzer** einem anderen
  Haushalt zuordnen. Die Änderung gilt sofort.
- **Einen Haushalt löschen** geht erst, wenn er keine Mitglieder mehr hat, und löscht seine Tiere und
  Einträge endgültig.

Alle Mitglieder eines Haushalts haben darin dieselben Rechte (Tiere, Einträge,
Benachrichtigungen, Einladungslink). Die Administrator-Rolle gilt für die ganze
Instanz und betrifft Konten und Einstellungen. Der **Katalog** für Futter und
Medikamente wird von allen Haushalten gemeinsam genutzt.

**Update von einer Version ohne Haushalte:** Nichts zu tun – die
Datenbank-Migration verschiebt alle bestehenden Nutzer und Tiere in einen
Haushalt und übernimmt die ntfy-Einstellungen (jetzt unter **Einstellungen**).
Beachte: Die offene Registrierung legt jetzt pro neuem Konto einen _eigenen_
Haushalt an; um Personen zu deinem Haushalt hinzuzufügen, nutze Einladungslinks.

Demo-Tiere in einen bestimmten Haushalt laden:
`docker compose exec app node server/src/db/cli.js seed --household <id>`.

## Reverse Proxy & HTTPS

Pet Manager immer über HTTPS betreiben. Hinter einem Proxy `TRUST_PROXY=1` setzen.

**Caddy** (automatische Let's-Encrypt-Zertifikate):

```caddyfile
pets.example.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3000
}
```

**nginx**:

```nginx
server {
    listen 443 ssl http2;
    server_name pets.example.com;

    ssl_certificate     /etc/letsencrypt/live/pets.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pets.example.com/privkey.pem;

    client_max_body_size 6m;   # Foto-Uploads (MAX_UPLOAD_MB + Overhead)

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name pets.example.com;
    return 301 https://$host$request_uri;
}
```

## Backup & Wiederherstellung

**Beides** sichern: die Datenbank und die hochgeladenen Fotos. Befehle im Verzeichnis mit der `docker-compose.yml` ausführen:

```bash
# Backup
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > pet-manager-$(date +%F).dump
docker compose exec -T app tar czf - -C /data/uploads . > pet-manager-uploads-$(date +%F).tgz

# Wiederherstellen (Stack muss laufen; vorhandene Daten werden ersetzt)
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' < pet-manager-JJJJ-MM-TT.dump
docker compose exec -T app tar xzf - -C /data/uploads < pet-manager-uploads-JJJJ-MM-TT.tgz
docker compose restart app
```

Backups an einem anderen Ort aufbewahren (andere Platte, extern) und die Wiederherstellung ab und zu testen.
Ohne Docker direkt `pg_dump`/`pg_restore` verwenden und `UPLOAD_DIR` kopieren.

## Aktualisieren

```bash
# 1. Backup anlegen (siehe oben)
git pull                               # holt die aktuelle docker-compose.yml und Doku
docker compose pull                    # oder: docker compose up -d --build zum lokalen Bauen
docker compose up -d
```

Datenbank-Migrationen laufen beim Start automatisch. Vor größeren Updates das [CHANGELOG](CHANGELOG.md) lesen.
Eine feste Version: `PET_MANAGER_IMAGE=ghcr.io/itssivvis/pet-manager:0.1.0` in der `.env` setzen.

## Sicherheit

- **Nur hinter HTTPS** betreiben und die Instanz aktuell halten.
- `JWT_SECRET` muss lang und zufällig sein; ohne startet der Server in Produktion nicht. Eine Änderung meldet alle Nutzer ab.
- Das **erste Konto wird Admin**. Danach ist die Registrierung **geschlossen** – der Admin kann sie unter _Administration_ öffnen. Neue Konten sind immer normale Nutzer.
- Tiere und Einträge sind pro **Haushalt** getrennt: Konten sehen nur die Daten ihres eigenen Haushalts (bei jeder Anfrage serverseitig erzwungen). Einladungslinks wirken wie ein Passwort zum Beitreten – sorgsam teilen und deaktivieren, wenn sie nicht mehr gebraucht werden.
- Anmeldung und Registrierung sind **ratenbegrenzt**, Passwörter brauchen ≥ 10 Zeichen und werden mit bcrypt gehasht. Eine Passwortänderung meldet alle anderen Sitzungen ab.
- Fotos werden anhand ihres Inhalts geprüft (JPEG/PNG/WebP/GIF), in der Größe begrenzt und unter Zufallsnamen gespeichert. Wer die (nicht erratbare) URL kennt, kann sie ohne Anmeldung abrufen.

### Anmeldepflicht abschalten („anonymer Modus")

Im vertrauenswürdigen Heimnetz möchtest du Pet Manager vielleicht ohne Anmeldung nutzen. Dafür sind **zwei** Schritte nötig:

1. Den Server mit `ALLOW_ANONYMOUS_MODE=true` starten.
2. Als Admin **Administration → Zugang & Sicherheit → Anmeldung erforderlich** ausschalten.

> [!WARNING]
> Im anonymen Modus kann **jede Person, die die Instanz erreicht, alle Tiere und Einträge des Haushalts lesen, ändern und löschen**, dessen Admin die Anmeldepflicht abgeschaltet hat – ohne Konto.
> **Niemals auf einer Instanz verwenden, die aus dem Internet erreichbar ist** (Portweiterleitung, öffentlicher Reverse Proxy, Tunnel).
> Der Administrationsbereich erfordert immer eine Admin-Anmeldung; anonyme Besucher können also keine Instanz-Einstellungen ändern.

Ohne `ALLOW_ANONYMOUS_MODE=true` ist der Schalter gesperrt, und die API lehnt jeden Versuch ab, die Anmeldepflicht abzuschalten.

Sicherheitslücken bitte vertraulich melden – siehe [SECURITY.md](SECURITY.md).

## Dokumentation

Die technische Dokumentation ist auf Englisch:

- [Architektur-Überblick](docs/architecture.md)
- [API-Referenz (OpenAPI)](docs/api/openapi.yaml)
- [Theming – eigenes Design hinzufügen](docs/theming.md)
- [Übersetzungen – Sprache hinzufügen](docs/translations.md)
- [Designentscheidungen](docs/design-decisions.md)
- [Mitmachen](CONTRIBUTING.md) · [Verhaltenskodex](CODE_OF_CONDUCT.md) · [Changelog](CHANGELOG.md)

## Roadmap

Ideen für kommende Versionen – Beiträge willkommen:

- [x] Mehrere Haushalte pro Instanz (getrennte Daten je Familie)
- [ ] Serverseitige Bildverkleinerung/Vorschaubilder
- [ ] Kalender-Export (iCal) für Termine und Gaben
- [ ] Weitere Benachrichtigungskanäle (E-Mail, Gotify, Web Push)
- [ ] CSV/JSON-Export und -Import aller Daten
- [ ] Gewichtsziele und Wachstumskurven für Jungtiere
- [ ] Anhänge (Laborbefunde, Rechnungen) an Gesundheitseinträgen
- [ ] Weitere Sprachen (Hilfe gesucht!)
- [ ] Sitzungen in HttpOnly-Cookies, optionaler OIDC-Login

## Lizenz

[MIT](LICENSE) © `itsSivvis`

Schriften: Inter, Nunito und Fredoka unter der SIL Open Font License 1.1 (über Fontsource).
Icons: Material Icons (Apache License 2.0) über `@mui/icons-material`.
