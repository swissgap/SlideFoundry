# Präsentations-App Bund

Dieses Verzeichnis enthält eine lokale, resiliente Enterprise-Web-App zum
Erstellen, Prüfen und Betreiben von On-Premise HTML-Präsentationen für
alle Unternehmensbereiche. Die App-Shell ist statisch auslieferbar,
erzeugt aus Briefings und Kontextdaten strukturierte Reveal.js-Decks und
orientiert sich an den Grundlagen des CD Bund Handbuchs 9.0.

Optional kann die Deck-Erzeugung über ein administrierbares LLM-Gateway
erweitert werden. Unterstützt werden On-Prem-LLMs mit OpenAI-kompatibler API
sowie Public-Provider wie OpenAI, Claude/Anthropic und Gemini/Google. API-Keys
werden nicht im Browser gespeichert, sondern serverseitig im Gateway über
OpenShift Secrets bereitgestellt.

## Struktur

```text
present_html/
├─ app.css
├─ app.js
├─ sw.js
├─ manifest.webmanifest
├─ health.json
├─ index.html
├─ assets/
├─ llm-gateway/
├─ openshift/
├─ schemas/deck.schema.json
├─ themes/bund/theme.json
├─ vendor/reveal.js/
└─ presentations/on-prem-framework/
   ├─ index.html
   └─ custom.css
```

Die detaillierte technische Funktionsbeschreibung liegt in
`TECHNISCHE_FUNKTIONSBESCHREIBUNG.md`.

## Lokal öffnen

Die App läuft über einen einfachen lokalen Webserver:

```sh
python3 -m http.server 8000
```

Danach ist die App unter `http://localhost:8000/` erreichbar.

Das Deck kann weiterhin direkt geöffnet werden:

```text
presentations/on-prem-framework/index.html
```

## Produktionsbetrieb

Die App enthält:

- eine App-Shell mit Präsentationsbibliothek und Vorschau,
- einen lokalen Präsentationsgenerator aus Briefing und Kontext,
- Profile für Board Update, Management-Entscheidung, Projektstatus,
  Strategie, Finanzreport, Risk Review, technische Architektur, Schulung,
  Workshop und Pitch,
- ein neutrales Deck-Schema mit universellen Folientypen,
- einen Governance-Score mit Schema-, Quellen- und Entscheidungschecks,
- einen Admin-Bereich für LLM-Provider, Gateway-Endpunkt, Modell und Temperatur,
- ein optionales LLM-Gateway mit lokalem Fallback bei Nichterreichbarkeit,
- Export generierter Decks als eigenständige HTML-Datei,
- einen Service Worker für Offline- und Cache-Fallbacks,
- ein Web App Manifest für Kiosk-/Standalone-Betrieb,
- `health.json` für einfache Monitoring-Checks,
- eine Nginx-Konfiguration mit Basis-Sicherheitsheadern,
- eine statische Validierung für CI/CD.

Container-Build:

```sh
docker build -t present-html-bund .
docker run --rm -p 8080:8080 present-html-bund
```

Lokaler Betrieb mit optionalem LLM-Gateway:

```sh
docker compose up --build
```

Die App läuft dann unter `http://localhost:8080/`. Das LLM-Gateway läuft unter
`http://localhost:8081/api/llm/health`; in der App kann als Gateway-Endpunkt
`http://localhost:8081/api/llm/generate` eingetragen werden.

## LLM-Gateway

Das Gateway liegt unter `llm-gateway/` und stellt bereit:

- `GET /api/llm/health`
- `POST /api/llm/generate`

Provider-Konfiguration erfolgt über Umgebungsvariablen:

- On-Prem / Ollama / OpenAI-kompatibel: `ONPREM_LLM_BASE_URL`, `ONPREM_LLM_MODEL`, optional `ONPREM_LLM_API_KEY`
- OpenAI: `OPENAI_API_KEY`, optional `OPENAI_BASE_URL`, `OPENAI_MODEL`
- Anthropic/Claude: `ANTHROPIC_API_KEY`, optional `ANTHROPIC_MODEL`
- Gemini/Google: `GEMINI_API_KEY`, optional `GEMINI_MODEL`

Die Web-App sendet Briefing, Profil, Schema und Governance-Parameter an das
Gateway. Das Gateway gibt ein strukturiertes Deck-JSON zurück. Falls das
Gateway nicht erreichbar ist oder ungültiges JSON liefert, verwendet die App
automatisch den lokalen regelbasierten Generator.

## OpenShift

Die OpenShift-Manifeste liegen unter `openshift/`:

- Frontend Deployment, Service und Route
- LLM-Gateway Deployment, Service und `/api` Route
- ConfigMap für Provider-Defaults
- Secret-Template für API-Keys

Die Routes sind für einen gemeinsamen Host vorbereitet:

- `/` geht auf das Frontend
- `/api` geht auf das LLM-Gateway

Vor dem Deployment müssen `CHANGE_NAMESPACE`, der Route-Host und die Image-Namen
an die Zielumgebung angepasst werden. Die Container laufen auf unprivilegierten
Ports (`8080`, `8081`) und enthalten Security-Kontexte für OpenShift.

CI/CD-Check lokal:

```sh
/Users/gap/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/validate-static.mjs
```

In GitHub Actions wird derselbe Check über `.github/workflows/static-check.yml`
ausgeführt.

## CD-Bund-Hinweis

Aus dem CD Bund Manual Deutsch wurden für diese Umsetzung insbesondere
die Grundsätze klassisch, diskret und klar, das Bundesrot `#FF0000`,
die viersprachige Kennzeichnung und die Schutzraum-Logik übernommen.
Die App nutzt lokale Systemschrift-Fallbacks und lädt keine externen CDNs,
Fonts oder Skripte.
