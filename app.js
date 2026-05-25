const STORAGE_KEY = "present-html-generated-decks";
const LLM_CONFIG_KEY = "present-html-llm-config";
const GENERATED_PREFIX = "generated-";

const SLIDE_TYPES = [
  "title",
  "agenda",
  "section",
  "content",
  "comparison",
  "timeline",
  "process",
  "decision",
  "risk",
  "kpi",
  "chart",
  "quote",
  "case_study",
  "roadmap",
  "appendix",
  "sources"
];

const profiles = {
  board_update: {
    label: "Board / Management Update",
    tags: ["Board", "KPI", "Risiko"],
    slides: ["title", "agenda", "kpi", "content", "risk", "decision", "roadmap", "sources"],
    tone: "Executive Summary, klare Abweichungen, Entscheidungen und Verantwortlichkeiten."
  },
  management_decision: {
    label: "Management-Entscheidung",
    tags: ["Entscheidung", "Optionen", "Risiko"],
    slides: ["title", "content", "comparison", "risk", "decision", "roadmap", "sources"],
    tone: "Problem, Optionen, Bewertung, Empfehlung und naechste Schritte."
  },
  project_status: {
    label: "Projektstatus",
    tags: ["Projekt", "Status", "Roadmap"],
    slides: ["title", "agenda", "kpi", "timeline", "risk", "decision", "sources"],
    tone: "Fortschritt, Abweichungen, Blocker, Entscheide und Termine."
  },
  strategy: {
    label: "Strategie",
    tags: ["Strategie", "Zielbild", "Roadmap"],
    slides: ["title", "section", "content", "comparison", "roadmap", "decision", "sources"],
    tone: "Strategische Lage, Zielbild, Handlungsfelder und Priorisierung."
  },
  financial_report: {
    label: "Finanzreport",
    tags: ["Finanzen", "KPI", "Forecast"],
    slides: ["title", "kpi", "chart", "risk", "decision", "appendix", "sources"],
    tone: "Zahlenorientiert, Abweichungen erklaert, Forecast und Massnahmen."
  },
  risk_review: {
    label: "Risk Review",
    tags: ["Risiko", "Kontrolle", "Massnahmen"],
    slides: ["title", "agenda", "risk", "process", "decision", "roadmap", "sources"],
    tone: "Risikolage, Kontrollen, Exposure, Massnahmen und Eskalationen."
  },
  technical_architecture: {
    label: "Technische Architektur",
    tags: ["Architektur", "Technik", "Betrieb"],
    slides: ["title", "content", "process", "comparison", "risk", "roadmap", "appendix", "sources"],
    tone: "Systemkontext, Architekturentscheidungen, Betrieb und technische Risiken."
  },
  training: {
    label: "Schulung",
    tags: ["Training", "Lernen", "Praxis"],
    slides: ["title", "agenda", "section", "process", "case_study", "decision", "appendix"],
    tone: "Lernziel, Beispiele, Uebungen und Transfer in die Praxis."
  },
  workshop: {
    label: "Workshop",
    tags: ["Workshop", "Interaktion", "Ergebnis"],
    slides: ["title", "agenda", "section", "process", "decision", "roadmap", "appendix"],
    tone: "Ziel, Arbeitsmodus, Diskussionsfragen, Ergebnisse und Follow-up."
  },
  sales_pitch: {
    label: "Angebot / Pitch",
    tags: ["Pitch", "Nutzen", "Angebot"],
    slides: ["title", "content", "case_study", "comparison", "roadmap", "decision", "sources"],
    tone: "Nutzenversprechen, Beleg, Differenzierung und Abschluss."
  }
};

const baseDecks = [
  {
    id: "on-prem-framework",
    title: "On-Premise HTML-Präsentationen",
    description: "Framework-Entscheidung für lokale, managementfähige HTML-Decks.",
    href: "./presentations/on-prem-framework/",
    slides: 7,
    tags: ["Reveal.js", "Offline", "Management"],
    type: "static",
    governance: { score: 86, checks: ["Lokale Assets", "CD Bund Theme", "Preview"], issues: [] }
  }
];

const elements = {
  alert: document.querySelector("#app-alert"),
  audience: document.querySelector("#audience-input"),
  brief: document.querySelector("#content-brief"),
  cacheState: document.querySelector("#cache-state"),
  clearGenerated: document.querySelector("#clear-generated"),
  confidential: document.querySelector("#confidential-input"),
  deckCards: document.querySelector("#deck-cards"),
  deckCount: document.querySelector("#deck-count"),
  exportCurrent: document.querySelector("#export-current"),
  form: document.querySelector("#generator-form"),
  governanceState: document.querySelector("#governance-state"),
  llmAdminForm: document.querySelector("#llm-admin-form"),
  llmEndpoint: document.querySelector("#llm-endpoint-input"),
  llmMode: document.querySelector("#llm-mode-input"),
  llmModel: document.querySelector("#llm-model-input"),
  llmProvider: document.querySelector("#llm-provider-input"),
  llmTemperature: document.querySelector("#llm-temperature-input"),
  networkState: document.querySelector("#network-state"),
  openCurrent: document.querySelector("#open-current"),
  owner: document.querySelector("#owner-input"),
  preview: document.querySelector("#deck-preview"),
  profile: document.querySelector("#profile-input"),
  reloadPreview: document.querySelector("#reload-preview"),
  requireDecision: document.querySelector("#require-decision-input"),
  requireSources: document.querySelector("#require-sources-input"),
  slideCount: document.querySelector("#slide-count-input"),
  sourceContext: document.querySelector("#source-context-input"),
  style: document.querySelector("#style-input"),
  testLlmConfig: document.querySelector("#test-llm-config"),
  title: document.querySelector("#deck-title-input")
};

const assetCache = new Map();
let generatedDecks = loadGeneratedDecks();
let llmConfig = loadLlmConfig();
let decks = [...baseDecks, ...generatedDecks];
let activeDeck = decks[0];
let activeObjectUrl = "";

function showAlert(message, type = "info") {
  elements.alert.textContent = message;
  elements.alert.dataset.type = type;
  elements.alert.hidden = false;
  window.clearTimeout(showAlert.timer);
  showAlert.timer = window.setTimeout(() => {
    elements.alert.hidden = true;
  }, 5200);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "praesentation";
}

function loadGeneratedDecks() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((deck) => deck.html && deck.deck) : [];
  } catch {
    return [];
  }
}

function persistGeneratedDecks() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(generatedDecks));
}

function loadLlmConfig() {
  const defaults = {
    endpoint: "/api/llm/generate",
    mode: "rules",
    model: "",
    provider: "onprem",
    temperature: 0.2
  };
  try {
    const raw = window.localStorage.getItem(LLM_CONFIG_KEY);
    return { ...defaults, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return defaults;
  }
}

function persistLlmConfig() {
  window.localStorage.setItem(LLM_CONFIG_KEY, JSON.stringify(llmConfig));
}

function applyLlmConfigToForm() {
  elements.llmEndpoint.value = llmConfig.endpoint;
  elements.llmMode.value = llmConfig.mode;
  elements.llmModel.value = llmConfig.model;
  elements.llmProvider.value = llmConfig.provider;
  elements.llmTemperature.value = String(llmConfig.temperature);
}

async function loadAsset(path) {
  if (!assetCache.has(path)) {
    assetCache.set(path, fetch(path).then((response) => {
      if (!response.ok) {
        throw new Error(`Asset missing: ${path}`);
      }
      return response.text();
    }));
  }
  return assetCache.get(path);
}

function getDeckById(deckId) {
  return decks.find((deck) => deck.id === deckId);
}

function renderDecks() {
  elements.deckCount.textContent = String(decks.length);
  const generated = generatedDecks.length;
  elements.governanceState.textContent = generated ? `${Math.max(...generatedDecks.map((deck) => deck.governance.score))}%` : "Schema";

  elements.deckCards.replaceChildren(...decks.map((deck) => {
    const card = document.createElement("button");
    card.className = `deck-card${deck.id === activeDeck.id ? " is-active" : ""}`;
    card.type = "button";
    card.dataset.deckId = deck.id;
    const score = deck.governance?.score ?? 0;
    const issues = deck.governance?.issues?.length ?? 0;
    card.innerHTML = `
      <h3>${escapeHtml(deck.title)}</h3>
      <p>${escapeHtml(deck.description)}</p>
      <div class="deck-meta">
        <span>${deck.slides} Folien</span>
        <span>${score}% Governance</span>
        ${deck.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
      </div>
      <div class="deck-card-actions">
        <span class="mini-button">${deck.type === "generated" ? "Generiert" : "Statisch"}</span>
        <span class="mini-button">${issues ? `${issues} Hinweise` : "Pruefung OK"}</span>
      </div>
    `;
    card.addEventListener("click", () => setActiveDeck(deck.id));
    return card;
  }));
}

function revokeObjectUrl() {
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = "";
  }
}

function setGeneratedPreview(deck) {
  revokeObjectUrl();
  const blob = new Blob([deck.html], { type: "text/html;charset=utf-8" });
  activeObjectUrl = URL.createObjectURL(blob);
  elements.preview.removeAttribute("srcdoc");
  elements.preview.src = activeObjectUrl;
  elements.openCurrent.href = activeObjectUrl;
  elements.openCurrent.removeAttribute("download");
}

function setStaticPreview(deck) {
  revokeObjectUrl();
  elements.preview.removeAttribute("srcdoc");
  elements.preview.src = deck.href;
  elements.openCurrent.href = deck.href;
  elements.openCurrent.removeAttribute("download");
}

function setActiveDeck(deckId) {
  const nextDeck = getDeckById(deckId);
  if (!nextDeck) {
    showAlert("Das angeforderte Deck ist nicht im Katalog registriert.", "error");
    return;
  }

  activeDeck = nextDeck;
  if (activeDeck.type === "generated") {
    setGeneratedPreview(activeDeck);
  } else {
    setStaticPreview(activeDeck);
  }
  renderDecks();
}

function splitTextBlocks(text) {
  const normalized = text
    .replace(/\r/g, "\n")
    .split(/\n+|(?:^|\s)[-•]\s+/)
    .flatMap((part) => part.split(/(?<=[.!?])\s+/))
    .map((part) => part.replace(/^\d+[.)]\s*/, "").trim())
    .filter((part) => part.length > 8);

  return normalized.length ? normalized : [text.trim()];
}

function pickKeywords(text) {
  const stopWords = new Set([
    "aber", "alle", "auch", "dass", "eine", "einen", "einer", "eines", "fuer", "für",
    "mit", "oder", "sich", "und", "von", "werden", "wird", "zum", "zur", "der",
    "die", "das", "den", "dem", "des", "als", "ist", "sind", "auf", "nicht",
    "werden", "soll", "sollen", "quartal", "praesentation", "präsentation"
  ]);
  const counts = new Map();
  text.toLowerCase().match(/[a-zäöüß0-9-]{4,}/gi)?.forEach((word) => {
    const key = word.replaceAll("ß", "ss");
    if (!stopWords.has(key)) {
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
}

function chunkPoints(points, count, start = 0) {
  return Array.from({ length: count }, (_, index) => points[(start + index) % points.length]);
}

function inferKpis(text) {
  const numbers = text.match(/(?:\d+[,.]?\d*\s?%|\d+[,.]?\d*\s?(?:Mio\.?|CHF|EUR|Tage|Wochen|FTE|MA|Projekte))/gi) || [];
  const defaults = ["Zielerreichung offen", "Risiken sichtbar", "Entscheidbedarf klar"];
  return (numbers.length ? numbers : defaults).slice(0, 3).map((value, index) => ({
    label: ["Kennzahl", "Trend", "Fokus"][index] || "Wert",
    value,
    note: index === 0 ? "Aus Briefing oder Kontext abgeleitet" : "Fuer Review markieren"
  }));
}

function buildSources(context) {
  const sources = splitTextBlocks(context || "")
    .slice(0, 6)
    .map((source, index) => ({ label: `Quelle ${index + 1}`, text: source }));
  return sources.length ? sources : [{ label: "Quelle 1", text: "Keine Quelle angegeben. Vor Freigabe ergaenzen." }];
}

function slideTitleFor(type, profile) {
  const titles = {
    title: profile.label,
    agenda: "Agenda und Zielbild",
    section: "Einordnung",
    content: "Kernaussagen",
    comparison: "Optionen und Bewertung",
    timeline: "Zeitplan und Meilensteine",
    process: "Vorgehen und Betriebsmodell",
    decision: "Entscheidungen und naechste Schritte",
    risk: "Risiken und Kontrollen",
    kpi: "Kennzahlen und Lagebild",
    chart: "Datenbild",
    quote: "Einordnung aus Quellen",
    case_study: "Anwendungsfall",
    roadmap: "Roadmap",
    appendix: "Anhang",
    sources: "Quellen und Annahmen"
  };
  return titles[type] || "Inhalt";
}

function buildSlide(type, index, context) {
  const { formData, profile, points, keywords, kpis, sources } = context;
  const common = {
    id: `s${index + 1}-${type}`,
    type,
    title: slideTitleFor(type, profile),
    notes: `${profile.tone} Zielgruppe: ${formData.audience}.`
  };

  if (type === "title") {
    return {
      ...common,
      title: formData.title,
      subtitle: `${profile.label} | ${formData.audience}`,
      bullets: [profile.tone, formData.confidential ? "Klassifizierung: Intern" : "Klassifizierung: Standard"],
      owner: formData.owner
    };
  }

  if (type === "agenda") {
    return { ...common, bullets: context.sequence.filter((item) => item !== "title").slice(0, 6).map((item) => slideTitleFor(item, profile)) };
  }

  if (type === "comparison") {
    return {
      ...common,
      columns: ["Option", "Nutzen", "Pruefpunkt"],
      rows: [
        ["Variante A", chunkPoints(points, 1, index)[0], "Umsetzbarkeit und Risiko"],
        ["Variante B", chunkPoints(points, 1, index + 1)[0], "Kosten, Akzeptanz und Betrieb"],
        ["Empfohlene Richtung", keywords.slice(0, 2).join(" / ") || "Priorisierte Option", "Entscheid faellig"]
      ]
    };
  }

  if (type === "risk") {
    return {
      ...common,
      risks: chunkPoints(points, 3, index).map((point, riskIndex) => ({
        risk: point,
        impact: ["hoch", "mittel", "mittel"][riskIndex],
        control: ["Owner benennen", "Review-Termin setzen", "Abhaengigkeit klaeren"][riskIndex]
      }))
    };
  }

  if (type === "kpi" || type === "chart") {
    return { ...common, kpis };
  }

  if (type === "timeline" || type === "roadmap") {
    return {
      ...common,
      milestones: ["Jetzt", "Naechster Schritt", "Naechstes Quartal", "Zielzustand"].map((label, milestoneIndex) => ({
        label,
        text: chunkPoints(points, 1, index + milestoneIndex)[0]
      }))
    };
  }

  if (type === "process") {
    return {
      ...common,
      steps: ["Ingest", "Struktur", "Review", "Freigabe"].map((label, stepIndex) => ({
        label,
        text: chunkPoints(points, 1, index + stepIndex)[0]
      }))
    };
  }

  if (type === "decision") {
    return {
      ...common,
      decision: chunkPoints(points, 1, index)[0],
      bullets: [
        "Entscheidbedarf benennen und Owner festlegen.",
        chunkPoints(points, 1, index + 1)[0],
        "Naechste Schritte mit Termin und Verantwortlichkeit pruefen."
      ]
    };
  }

  if (type === "sources") {
    return { ...common, sources };
  }

  if (type === "appendix") {
    return { ...common, bullets: [...chunkPoints(points, 2, index), "Detaildaten, Annahmen und offene Punkte separat nachfuehren."] };
  }

  if (type === "case_study") {
    return {
      ...common,
      quote: chunkPoints(points, 1, index)[0],
      bullets: chunkPoints(points, 3, index + 1)
    };
  }

  return { ...common, bullets: chunkPoints(points, 4, index), keywords };
}

function buildDeckModel(formData) {
  const profile = profiles[formData.profile] || profiles.board_update;
  const requested = Math.max(4, Math.min(10, Number(formData.count) || 7));
  const sequence = profile.slides.slice(0, requested);
  if (formData.requireDecision && !sequence.includes("decision")) {
    sequence.splice(Math.max(1, sequence.length - 1), 0, "decision");
  }
  if (formData.requireSources && !sequence.includes("sources")) {
    sequence.push("sources");
  }
  while (sequence.length > requested) {
    const removable = sequence.findIndex((type) => !["title", "decision", "sources"].includes(type));
    if (removable < 0) {
      break;
    }
    sequence.splice(removable, 1);
  }

  const allText = `${formData.title}\n${formData.brief}\n${formData.context}`;
  const points = splitTextBlocks(allText);
  const context = {
    formData,
    profile,
    points,
    keywords: pickKeywords(allText),
    kpis: inferKpis(allText),
    sources: buildSources(formData.context),
    sequence
  };

  return {
    schemaVersion: "1.0.0",
    id: `${GENERATED_PREFIX}${Date.now()}`,
    title: formData.title,
    profile: formData.profile,
    profileLabel: profile.label,
    audience: formData.audience,
    owner: formData.owner,
    classification: formData.confidential ? "Intern" : "Standard",
    theme: "bund",
    createdAt: new Date().toISOString(),
    tags: [...profile.tags, ...context.keywords.slice(0, 2)],
    sources: context.sources,
    slides: sequence.map((type, index) => buildSlide(type, index, context))
  };
}

function normalizeSlide(slide, fallbackSlide, index) {
  const type = SLIDE_TYPES.includes(slide?.type) ? slide.type : fallbackSlide.type;
  return {
    ...fallbackSlide,
    ...slide,
    id: slide?.id || fallbackSlide.id || `s${index + 1}-${type}`,
    title: slide?.title || fallbackSlide.title || "Inhalt",
    type
  };
}

function normalizeLlmDeckModel(candidate, fallbackDeck, formData) {
  if (!candidate || typeof candidate !== "object") {
    return fallbackDeck;
  }

  const fallbackSlides = fallbackDeck.slides;
  const candidateSlides = Array.isArray(candidate.slides) ? candidate.slides : [];
  const normalizedSlides = fallbackSlides.map((fallbackSlide, index) => normalizeSlide(candidateSlides[index], fallbackSlide, index));

  if (candidateSlides.length > fallbackSlides.length) {
    candidateSlides.slice(fallbackSlides.length, formData.count).forEach((slide, extraIndex) => {
      const fallbackSlide = fallbackSlides[fallbackSlides.length - 1];
      normalizedSlides.push(normalizeSlide(slide, fallbackSlide, fallbackSlides.length + extraIndex));
    });
  }

  return {
    ...fallbackDeck,
    ...candidate,
    id: fallbackDeck.id,
    schemaVersion: "1.0.0",
    title: candidate.title || fallbackDeck.title,
    profile: formData.profile,
    profileLabel: profiles[formData.profile]?.label || fallbackDeck.profileLabel,
    audience: formData.audience,
    owner: formData.owner,
    classification: formData.confidential ? "Intern" : "Standard",
    theme: "bund",
    createdAt: fallbackDeck.createdAt,
    tags: Array.isArray(candidate.tags) && candidate.tags.length ? candidate.tags : fallbackDeck.tags,
    sources: Array.isArray(candidate.sources) && candidate.sources.length ? candidate.sources : fallbackDeck.sources,
    slides: normalizedSlides.slice(0, formData.count)
  };
}

function buildLlmRequest(formData) {
  return {
    formData,
    model: llmConfig.model || undefined,
    profile: profiles[formData.profile],
    provider: llmConfig.provider,
    schema: {
      schemaVersion: "1.0.0",
      slideTypes: SLIDE_TYPES,
      requiredFields: ["title", "profile", "audience", "theme", "slides"]
    },
    temperature: Number(llmConfig.temperature) || 0.2
  };
}

async function requestLlmDeckModel(formData, fallbackDeck) {
  if (llmConfig.mode !== "gateway") {
    return fallbackDeck;
  }

  const response = await fetch(llmConfig.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildLlmRequest(formData))
  });

  if (!response.ok) {
    throw new Error(`LLM gateway returned ${response.status}`);
  }

  const payload = await response.json();
  return normalizeLlmDeckModel(payload.deck, fallbackDeck, formData);
}

function validateDeckModel(deck, options) {
  const issues = [];
  const checks = [];

  if (!deck.title || deck.title.length < 4) {
    issues.push("Titel fehlt oder ist zu kurz.");
  } else {
    checks.push("Titel vorhanden");
  }

  if (!profiles[deck.profile]) {
    issues.push("Profil ist nicht registriert.");
  } else {
    checks.push("Profil registriert");
  }

  if (!Array.isArray(deck.slides) || deck.slides.length < 4) {
    issues.push("Mindestens vier Folien erforderlich.");
  } else {
    checks.push("Folienanzahl plausibel");
  }

  const invalidSlide = deck.slides.find((slide) => !SLIDE_TYPES.includes(slide.type) || !slide.title);
  if (invalidSlide) {
    issues.push(`Ungueltiger Folientyp oder Titel: ${invalidSlide.type || "unbekannt"}.`);
  } else {
    checks.push("Folientypen schema-konform");
  }

  if (options.requireDecision && !deck.slides.some((slide) => slide.type === "decision")) {
    issues.push("Entscheidungsfolie fehlt.");
  } else {
    checks.push("Entscheidungslogik vorhanden");
  }

  if (options.requireSources && !deck.slides.some((slide) => slide.type === "sources")) {
    issues.push("Quellenfolie fehlt.");
  } else {
    checks.push("Quellenlogik vorhanden");
  }

  const longBullets = deck.slides.flatMap((slide) => slide.bullets || []).filter((bullet) => bullet.length > 170);
  if (longBullets.length) {
    issues.push("Einige Bullet Points sind lang und sollten redaktionell gekuerzt werden.");
  } else {
    checks.push("Bullet-Laengen im Rahmen");
  }

  checks.push("CD Bund Theme erzwungen");
  checks.push("Keine externen Laufzeit-Assets");

  const score = Math.max(0, Math.min(100, 100 - issues.length * 12));
  return { score, checks, issues };
}

function generatedDeckCss() {
  return `
    :root{--bund-red:#ff0000;--ink:#111;--muted:#5f6368;--line:#d8d8d8;--surface:#fff;--soft:#f6f6f6}
    .reveal{font-family:Frutiger,Arial,"Helvetica Neue",Helvetica,sans-serif;color:var(--ink);background:linear-gradient(180deg,var(--soft),#fff)}
    .reveal .slides{text-align:left}
    .reveal section{box-sizing:border-box;padding:42px 34px}
    .reveal h1,.reveal h2,.reveal h3,.reveal p,.reveal li,.reveal td,.reveal th{letter-spacing:0}
    .reveal h1,.reveal h2,.reveal h3{margin:0;color:var(--ink);font-weight:820;text-transform:none;line-height:1.04}
    .reveal h1{max-width:920px;font-size:2.12em}.reveal h2{max-width:900px;margin-bottom:28px;font-size:1.58em}
    .reveal h3{font-size:.78em}.reveal p,.reveal li,.reveal td,.reveal th{font-size:.58em;line-height:1.45}
    .kicker{display:inline-flex;margin-bottom:18px;padding:7px 12px;color:#fff;background:var(--bund-red);font-size:.34em;font-weight:850;text-transform:uppercase}
    .lead{max-width:820px;color:var(--muted);font-size:.68em}.meta-line{margin-top:24px;color:var(--muted);font-size:.44em}
    .slide-grid{display:grid;grid-template-columns:1fr 320px;gap:30px;align-items:start}.bullet-list{display:grid;gap:14px;margin:0;padding-left:28px}
    .keyword-stack,.kpi-grid,.timeline,.process,.decision,.risk-grid{display:grid;gap:12px}
    .keyword-stack span,.kpi,.milestone,.step,.decision p,.risk,.source{padding:14px 16px;border:1px solid var(--line);background:#fff}
    .keyword-stack span{font-size:.42em;font-weight:800}.kpi strong{display:block;font-size:1.25em}.kpi span,.milestone span,.step span,.risk span,.source span{display:block;color:var(--muted);font-size:.8em}
    .kpi-grid{grid-template-columns:repeat(3,1fr)}.timeline{grid-template-columns:repeat(4,1fr)}.process{grid-template-columns:repeat(4,1fr)}
    .decision p{margin:0;border-left:7px solid var(--bund-red)}.risk{border-left:7px solid var(--bund-red)}
    table{width:100%;border-collapse:collapse;border-top:5px solid var(--bund-red);background:#fff}th,td{padding:16px;border-bottom:1px solid var(--line);vertical-align:top}th{color:#fff;background:#111;font-weight:850}
    blockquote{margin:0;padding:22px 26px;border-left:8px solid var(--bund-red);background:#fff;font-size:.72em;line-height:1.45}
    .reveal .controls{color:var(--bund-red)}.reveal .progress{color:var(--bund-red)}
  `;
}

function renderList(items) {
  return `<ul class="bullet-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderSlide(slide) {
  if (slide.type === "title") {
    return `
      <section>
        <div class="kicker">${escapeHtml(slide.owner || "Enterprise Presentation Factory")}</div>
        <h1>${escapeHtml(slide.title)}</h1>
        <p class="lead">${escapeHtml(slide.subtitle)}</p>
        <p class="meta-line">${escapeHtml((slide.bullets || []).join(" | "))}</p>
      </section>
    `;
  }

  if (slide.type === "agenda") {
    return `<section><div class="kicker">Struktur</div><h2>${escapeHtml(slide.title)}</h2>${renderList(slide.bullets || [])}</section>`;
  }

  if (slide.type === "comparison") {
    return `
      <section>
        <div class="kicker">Bewertung</div>
        <h2>${escapeHtml(slide.title)}</h2>
        <table>
          <thead><tr>${slide.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>
          <tbody>${slide.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>
      </section>
    `;
  }

  if (slide.type === "risk") {
    return `
      <section>
        <div class="kicker">Governance</div>
        <h2>${escapeHtml(slide.title)}</h2>
        <div class="risk-grid">${slide.risks.map((item) => `
          <article class="risk"><strong>${escapeHtml(item.risk)}</strong><span>Impact: ${escapeHtml(item.impact)} | Kontrolle: ${escapeHtml(item.control)}</span></article>
        `).join("")}</div>
      </section>
    `;
  }

  if (slide.type === "kpi" || slide.type === "chart") {
    return `
      <section>
        <div class="kicker">Daten</div>
        <h2>${escapeHtml(slide.title)}</h2>
        <div class="kpi-grid">${slide.kpis.map((item) => `
          <article class="kpi"><strong>${escapeHtml(item.value)}</strong><span>${escapeHtml(item.label)} - ${escapeHtml(item.note)}</span></article>
        `).join("")}</div>
      </section>
    `;
  }

  if (slide.type === "timeline" || slide.type === "roadmap") {
    return `
      <section>
        <div class="kicker">Planung</div>
        <h2>${escapeHtml(slide.title)}</h2>
        <div class="timeline">${slide.milestones.map((item) => `
          <article class="milestone"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.text)}</span></article>
        `).join("")}</div>
      </section>
    `;
  }

  if (slide.type === "process") {
    return `
      <section>
        <div class="kicker">Vorgehen</div>
        <h2>${escapeHtml(slide.title)}</h2>
        <div class="process">${slide.steps.map((item) => `
          <article class="step"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.text)}</span></article>
        `).join("")}</div>
      </section>
    `;
  }

  if (slide.type === "decision") {
    return `<section><div class="kicker">Entscheid</div><h2>${escapeHtml(slide.title)}</h2><div class="decision"><p><strong>${escapeHtml(slide.decision)}</strong></p>${(slide.bullets || []).map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div></section>`;
  }

  if (slide.type === "sources") {
    return `
      <section>
        <div class="kicker">Nachvollziehbarkeit</div>
        <h2>${escapeHtml(slide.title)}</h2>
        <div class="keyword-stack">${slide.sources.map((source) => `<article class="source"><strong>${escapeHtml(source.label)}</strong><span>${escapeHtml(source.text)}</span></article>`).join("")}</div>
      </section>
    `;
  }

  if (slide.type === "case_study" || slide.type === "quote") {
    return `<section><div class="kicker">Beispiel</div><h2>${escapeHtml(slide.title)}</h2><blockquote>${escapeHtml(slide.quote || "")}</blockquote>${renderList(slide.bullets || [])}</section>`;
  }

  return `
    <section>
      <div class="kicker">${escapeHtml(slide.type)}</div>
      <h2>${escapeHtml(slide.title)}</h2>
      <div class="slide-grid">
        ${renderList(slide.bullets || [])}
        <div class="keyword-stack">${(slide.keywords || []).map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("")}</div>
      </div>
    </section>
  `;
}

function renderGovernanceAppendix(deck, governance) {
  return `
    <section>
      <div class="kicker">Automatische Pruefung</div>
      <h2>Governance-Report</h2>
      <div class="kpi-grid">
        <article class="kpi"><strong>${governance.score}%</strong><span>Governance Score</span></article>
        <article class="kpi"><strong>${deck.slides.length}</strong><span>Schema-Folien</span></article>
        <article class="kpi"><strong>${governance.issues.length}</strong><span>Hinweise</span></article>
      </div>
      <div class="decision">
        ${governance.checks.map((check) => `<p>${escapeHtml(check)}</p>`).join("")}
        ${governance.issues.map((issue) => `<p>${escapeHtml(issue)}</p>`).join("")}
      </div>
    </section>
  `;
}

async function buildGeneratedHtml(deck, governance) {
  const [resetCss, revealCss, revealJs] = await Promise.all([
    loadAsset("./vendor/reveal.js/dist/reset.css"),
    loadAsset("./vendor/reveal.js/dist/reveal.css"),
    loadAsset("./vendor/reveal.js/dist/reveal.js")
  ]);
  const safeRevealJs = revealJs.replace(/<\/script/gi, "<\\/script");
  const slides = `${deck.slides.map(renderSlide).join("")}${renderGovernanceAppendix(deck, governance)}`;

  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(deck.title)}</title>
    <meta name="generator" content="Enterprise Presentation Factory">
    <script type="application/json" id="deck-schema">${JSON.stringify(deck).replace(/<\/script/gi, "<\\/script")}</script>
    <style>${resetCss}</style>
    <style>${revealCss}</style>
    <style>${generatedDeckCss()}</style>
  </head>
  <body>
    <div class="reveal"><div class="slides">${slides}</div></div>
    <script>${safeRevealJs}</script>
    <script>Reveal.initialize({hash:true,controls:true,progress:true,slideNumber:"c/t",transition:"slide"});</script>
  </body>
</html>`;
}

function buildDeckRecord(deck, html, governance) {
  return {
    id: deck.id,
    title: deck.title,
    description: `${deck.profileLabel}: ${deck.audience} | ${deck.classification}`,
    href: "",
    slides: deck.slides.length + 1,
    tags: ["Generiert", ...deck.tags.slice(0, 4)],
    type: "generated",
    createdAt: deck.createdAt,
    governance,
    deck,
    html
  };
}

function updateNetworkState() {
  const online = navigator.onLine;
  elements.networkState.textContent = online ? "Online bereit" : "Offline-Modus";
  elements.networkState.classList.toggle("is-online", online);
  elements.networkState.classList.toggle("is-offline", !online);
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    elements.cacheState.textContent = "Nicht verfügbar";
    showAlert("Dieser Browser unterstützt keinen Service Worker.", "warning");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register("./sw.js", { scope: "./" });
    elements.cacheState.textContent = "Aktiv";
    if (registration.waiting) {
      showAlert("Eine neue App-Version ist bereit und wird beim nächsten Laden aktiv.");
    }
  } catch (error) {
    elements.cacheState.textContent = "Fehler";
    showAlert("Offline-Cache konnte nicht aktiviert werden.", "error");
    console.error(error);
  }
}

function exportDeck(deck) {
  if (deck.type !== "generated") {
    showAlert("Statische Decks sind bereits als Datei im Projekt vorhanden.");
    return;
  }

  const blob = new Blob([deck.html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(deck.title)}.html`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 400);
}

function collectFormData() {
  return {
    audience: elements.audience.value,
    brief: elements.brief.value.trim(),
    confidential: elements.confidential.checked,
    context: elements.sourceContext.value.trim(),
    count: Math.max(4, Math.min(10, Number(elements.slideCount.value) || 7)),
    owner: elements.owner.value.trim() || "Organisation",
    profile: elements.profile.value,
    requireDecision: elements.requireDecision.checked,
    requireSources: elements.requireSources.checked,
    style: elements.style.value,
    title: elements.title.value.trim() || "Neue Unternehmenspräsentation"
  };
}

function bindEvents() {
  window.addEventListener("online", updateNetworkState);
  window.addEventListener("offline", updateNetworkState);

  window.addEventListener("error", () => {
    showAlert("Ein App-Fehler wurde abgefangen. Die Oberfläche bleibt bedienbar.", "error");
  });

  window.addEventListener("unhandledrejection", () => {
    showAlert("Ein Hintergrundprozess konnte nicht abgeschlossen werden.", "error");
  });

  elements.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = collectFormData();

    if (formData.brief.length < 24) {
      showAlert("Bitte eine aussagekräftigere Beschreibung eingeben.", "error");
      return;
    }

    const submitter = elements.form.querySelector('button[type="submit"]');
    submitter.disabled = true;
    submitter.textContent = "Generiere...";
    try {
      const fallbackDeck = buildDeckModel(formData);
      let deckModel = fallbackDeck;
      if (llmConfig.mode === "gateway") {
        try {
          deckModel = await requestLlmDeckModel(formData, fallbackDeck);
        } catch (error) {
          console.warn(error);
          showAlert("LLM-Gateway nicht verfügbar. Lokaler Generator wurde verwendet.", "warning");
        }
      }
      const governance = validateDeckModel(deckModel, formData);
      const html = await buildGeneratedHtml(deckModel, governance);
      const deck = buildDeckRecord(deckModel, html, governance);
      generatedDecks = [deck, ...generatedDecks].slice(0, 20);
      decks = [...baseDecks, ...generatedDecks];
      persistGeneratedDecks();
      setActiveDeck(deck.id);
      showAlert(`Präsentation generiert. Governance Score: ${governance.score}%.`);
    } catch (error) {
      console.error(error);
      showAlert("Die Präsentation konnte nicht generiert werden.", "error");
    } finally {
      submitter.disabled = false;
      submitter.textContent = "Präsentation generieren";
    }
  });

  elements.llmAdminForm.addEventListener("submit", (event) => {
    event.preventDefault();
    llmConfig = {
      endpoint: elements.llmEndpoint.value.trim() || "/api/llm/generate",
      mode: elements.llmMode.value,
      model: elements.llmModel.value.trim(),
      provider: elements.llmProvider.value,
      temperature: Number(elements.llmTemperature.value) || 0.2
    };
    persistLlmConfig();
    showAlert(llmConfig.mode === "gateway" ? "LLM-Gateway-Konfiguration gespeichert." : "Lokaler Regelgenerator aktiviert.");
  });

  elements.testLlmConfig.addEventListener("click", async () => {
    const healthEndpoint = elements.llmEndpoint.value.trim().replace(/\/generate$/, "/health");
    try {
      const response = await fetch(healthEndpoint, { headers: { "Accept": "application/json" } });
      if (!response.ok) {
        throw new Error(`Status ${response.status}`);
      }
      const payload = await response.json();
      showAlert(`LLM-Gateway erreichbar: ${payload.status || "ok"}.`);
    } catch (error) {
      console.warn(error);
      showAlert("LLM-Gateway nicht erreichbar. OpenShift Route/Service und Secrets prüfen.", "error");
    }
  });

  elements.clearGenerated.addEventListener("click", () => {
    generatedDecks = [];
    decks = [...baseDecks];
    persistGeneratedDecks();
    setActiveDeck(baseDecks[0].id);
    showAlert("Generierte Entwürfe wurden entfernt.");
  });

  elements.exportCurrent.addEventListener("click", () => exportDeck(activeDeck));

  elements.reloadPreview.addEventListener("click", () => {
    if (activeDeck.type === "generated") {
      setGeneratedPreview(activeDeck);
    } else {
      const current = elements.preview.src;
      elements.preview.src = "about:blank";
      window.setTimeout(() => {
        elements.preview.src = current;
      }, 80);
    }
    showAlert("Vorschau wurde neu geladen.");
  });

  elements.preview.addEventListener("error", () => {
    showAlert("Die Vorschau konnte nicht geladen werden. Öffnen Sie das Deck direkt.", "error");
  });
}

renderDecks();
applyLlmConfigToForm();
bindEvents();
updateNetworkState();
registerServiceWorker();
