# Technische Funktionsbeschreibung

Die App ist eine lokale **Enterprise Presentation Factory** zur Erstellung,
Prüfung, Vorschau und Auslieferung von CI-konformen HTML-Präsentationen
auf Basis von Reveal.js. Sie läuft vollständig als statische Web-App und
benötigt im aktuellen Stand kein Backend und keine externe Cloud-Verbindung.

## Zweck

Die Anwendung ermöglicht es, aus einem Briefing, optionalem Quellen- oder
Datenkontext und einem Präsentationsprofil automatisch ein strukturiertes
Präsentationsmodell zu erzeugen. Dieses Modell wird gegen Governance-Regeln
geprüft und anschließend als Reveal.js-Präsentation gerendert.

Die App ist für unterschiedliche Präsentationsthemen im Unternehmen ausgelegt,
zum Beispiel Management-Updates, Projektstatus, Strategie, Finanzberichte,
Risiko-Reviews, technische Architektur, Schulungen, Workshops und Pitch- oder
Angebotspräsentationen.

Optional kann die Erzeugung über ein LLM-Gateway erfolgen. Das Gateway kapselt
On-Prem-LLMs mit OpenAI-kompatibler API sowie Public-Provider wie OpenAI,
Claude/Anthropic und Gemini/Google. Die Web-App bleibt dabei ohne API-Schlüssel;
Secrets werden serverseitig im Gateway verwaltet.

## Architektur

Die Anwendung besteht aus folgenden Hauptbestandteilen:

- `index.html`: App-Shell, Eingabeformular, Bibliothek, Betriebschecks und Vorschau
- `app.js`: Generatorlogik, Profilmodell, Schemaerzeugung, Rendering, Export und lokale Speicherung
- `app.css`: UI-Design nach CD-Bund-naher Gestaltung
- `sw.js`: Service Worker für Offlinefähigkeit und Cache-Fallback
- `schemas/deck.schema.json`: neutrales Präsentationsschema
- `themes/bund/theme.json`: zentrales Corporate-Design-Theme
- `llm-gateway/main.py`: serverseitige LLM-API-Abstraktion
- `llm-gateway/Containerfile`: Containerdefinition für das Gateway
- `openshift/`: OpenShift-Manifeste für Frontend, Gateway, Services und Routes
- `scripts/validate-static.mjs`: CI/CD-Validierung
- `health.json`: einfacher Health-Check für Betrieb und Monitoring

## Funktionsweise

1. Der Nutzer gibt ein Briefing ein.
2. Optional ergänzt er Quellen, Daten oder Kontext.
3. Er wählt Präsentationsprofil, Zielgruppe, Folienanzahl, Tonalität und Organisationseinheit.
4. Die App erzeugt daraus ein strukturiertes Deck-Objekt.
5. Falls im Admin-Bereich aktiviert, wird das LLM-Gateway zur Deck-Erzeugung
   aufgerufen.
6. Wenn das Gateway nicht verfügbar ist oder ungültige Daten liefert, nutzt
   die App automatisch den lokalen regelbasierten Generator.
7. Das Deck wird gegen Governance-Regeln geprüft.
8. Aus dem validierten Modell wird eine Reveal.js-Präsentation erzeugt.
9. Die Präsentation erscheint in der Vorschau.
10. Das Deck kann als eigenständige HTML-Datei exportiert werden.

## Präsentationsprofile

Die App unterstützt aktuell diese Profile:

- `board_update`
- `management_decision`
- `project_status`
- `strategy`
- `financial_report`
- `risk_review`
- `technical_architecture`
- `training`
- `workshop`
- `sales_pitch`

Jedes Profil definiert typische Folienabfolgen, Tags und Tonalität. Dadurch
kann dieselbe App für verschiedene Unternehmensbereiche verwendet werden.

## Deck-Schema

Das interne Deck-Modell enthält unter anderem:

- Titel
- Profil
- Zielgruppe
- Organisationseinheit
- Klassifizierung
- Theme
- Quellen
- Folienliste
- Tags
- Erstellungszeitpunkt

Unterstützte Folientypen sind unter anderem:

- `title`
- `agenda`
- `content`
- `comparison`
- `timeline`
- `process`
- `decision`
- `risk`
- `kpi`
- `chart`
- `case_study`
- `roadmap`
- `appendix`
- `sources`

## Governance

Beim Generieren prüft die App automatisch:

- ob ein gültiges Profil verwendet wird
- ob die Mindestanzahl an Folien erreicht wird
- ob alle Folientypen schema-konform sind
- ob eine Entscheidungsfolie vorhanden ist, falls gefordert
- ob eine Quellenfolie vorhanden ist, falls gefordert
- ob Bullet Points nicht zu lang sind
- ob das CD-Bund-Theme erzwungen wird
- ob keine externen Runtime-Assets erforderlich sind

Das Ergebnis wird als Governance-Score angezeigt und zusätzlich im generierten
Deck als Governance-Report-Folie ergänzt.

## LLM-Anbindung

Die LLM-Anbindung ist administrierbar. Im Admin-Bereich der Web-App können
konfiguriert werden:

- Generator-Modus: lokal regelbasiert oder LLM via API mit Fallback
- Provider: On-Prem/OpenAI-kompatibel, OpenAI, Claude/Anthropic oder Gemini
- Gateway-Endpunkt
- Modellname
- Temperatur

Die App sendet keine API-Schlüssel. Der Browser ruft nur das Gateway auf:

```text
POST /api/llm/generate
GET  /api/llm/health
```

Das Gateway erzeugt aus Briefing, Profil, Schema und Kontext einen Provider-
Prompt und erwartet als Antwort ein JSON-Deck. Die Antwort wird in der Web-App
normalisiert, gegen das lokale Schema geprüft und anschließend gerendert.

Serverseitige Provider-Konfiguration:

- `ONPREM_LLM_BASE_URL`, `ONPREM_LLM_MODEL`, optional `ONPREM_LLM_API_KEY`
- `OPENAI_API_KEY`, optional `OPENAI_BASE_URL`, `OPENAI_MODEL`
- `ANTHROPIC_API_KEY`, optional `ANTHROPIC_MODEL`
- `GEMINI_API_KEY`, optional `GEMINI_MODEL`

Dadurch kann die gleiche Web-App entweder vollständig on-premise mit lokalen
LLMs oder kontrolliert mit Public-LLMs betrieben werden.

## Rendering

Die Präsentation wird nicht als freier HTML-String erzeugt, sondern aus einem
kontrollierten strukturierten Modell gerendert. Die App rendert daraus ein
vollständiges HTML-Dokument mit eingebettetem Reveal.js, CSS und Deck-JSON.

Das generierte HTML enthält zusätzlich ein eingebettetes JSON-Modell:

```html
<script type="application/json" id="deck-schema">
  ...
</script>
```

Dadurch bleibt die Präsentation nachvollziehbar, prüfbar und später
weiterverarbeitbar.

## Offlinefähigkeit

Der Service Worker cached:

- App-Shell
- CSS und JavaScript
- Manifest
- Health-Datei
- Schema
- Theme
- Bund-Markierung
- Reveal.js-Dateien
- bestehende Beispielpräsentation

Damit kann die App im lokalen Netzwerk oder auf einem Einzelrechner ohne externe
Verbindung betrieben werden.

## Export

Generierte Präsentationen können als eigenständige HTML-Datei exportiert werden.
Die exportierte Datei enthält die notwendigen Reveal.js- und CSS-Inhalte
eingebettet und ist damit portabel.

## Betrieb

Die App kann lokal mit einem einfachen Webserver gestartet werden:

```sh
python3 -m http.server 8000
```

Produktiv kann sie über Nginx ausgeliefert werden. Dafür existieren:

- `Dockerfile`
- `nginx.conf`

Für die optionale LLM-Anbindung gibt es zusätzlich:

- `llm-gateway/Containerfile`
- `llm-gateway/main.py`
- `docker-compose.yml`

## OpenShift / RHOS

Die App ist für OpenShift vorbereitet:

- Frontend und LLM-Gateway laufen als getrennte Deployments.
- Beide Container nutzen unprivilegierte Ports (`8080`, `8081`).
- Deployments enthalten Readiness- und Liveness-Probes.
- Security-Kontexte deaktivieren Privilege Escalation und droppen Linux
  Capabilities.
- Die Route `/` zeigt auf das Frontend.
- Die Route `/api` zeigt auf das LLM-Gateway.
- Provider-Defaults liegen in einer ConfigMap.
- API-Keys liegen in einem Secret.

Die Manifeste befinden sich unter:

```text
openshift/
```

## CI/CD

Die Datei `scripts/validate-static.mjs` prüft:

- Vorhandensein aller produktionsrelevanten Dateien
- keine externen Runtime-Referenzen in App-Dateien
- Manifest-Konfiguration
- Pflicht-Folientypen im Schema
- CD-Bund-Rot `#ff0000`
- Vorhandensein zentraler Enterprise-Profile
- Vorhandensein des LLM-Gateways
- Vorhandensein zentraler OpenShift-Manifeste

Die GitHub-Actions-Konfiguration liegt unter:

```text
.github/workflows/static-check.yml
```
