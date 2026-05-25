import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const requiredFiles = [
  "index.html",
  "app.css",
  "app.js",
  "sw.js",
  "manifest.webmanifest",
  "health.json",
  "schemas/deck.schema.json",
  "themes/bund/theme.json",
  "llm-gateway/main.py",
  "llm-gateway/requirements.txt",
  "llm-gateway/Containerfile",
  "openshift/kustomization.yaml",
  "openshift/frontend-deployment.yaml",
  "openshift/llm-gateway-deployment.yaml",
  "openshift/llm-gateway-route.yaml",
  "assets/bund-mark.svg",
  "presentations/on-prem-framework/index.html",
  "presentations/on-prem-framework/custom.css",
  "vendor/reveal.js/dist/reveal.js",
  "vendor/reveal.js/dist/reveal.css",
  "vendor/reveal.js/dist/reset.css"
];

const locallyAuthoredFiles = [
  "index.html",
  "app.css",
  "app.js",
  "sw.js",
  "manifest.webmanifest",
  "presentations/on-prem-framework/index.html",
  "presentations/on-prem-framework/custom.css"
];

const externalPattern = /https?:\/\/|\/\/cdn|fonts\.googleapis|@import\s+url\(/i;

for (const file of requiredFiles) {
  const absolute = resolve(root, file);
  await stat(absolute);
}

for (const file of locallyAuthoredFiles) {
  const content = await readFile(resolve(root, file), "utf8");
  if (externalPattern.test(content)) {
    throw new Error(`External runtime reference found in ${file}`);
  }
}

const manifest = JSON.parse(await readFile(resolve(root, "manifest.webmanifest"), "utf8"));
if (manifest.display !== "standalone") {
  throw new Error("Manifest must use standalone display mode.");
}

const deckSchema = JSON.parse(await readFile(resolve(root, "schemas/deck.schema.json"), "utf8"));
const slideTypes = deckSchema.properties.slides.items.properties.type.enum;
for (const requiredType of ["title", "decision", "risk", "kpi", "sources"]) {
  if (!slideTypes.includes(requiredType)) {
    throw new Error(`Deck schema is missing slide type ${requiredType}.`);
  }
}

const theme = JSON.parse(await readFile(resolve(root, "themes/bund/theme.json"), "utf8"));
if (theme.colors.red.toLowerCase() !== "#ff0000") {
  throw new Error("Bund theme must enforce #ff0000 as red.");
}

const appCode = await readFile(resolve(root, "app.js"), "utf8");
for (const profile of ["board_update", "project_status", "financial_report", "technical_architecture", "training", "workshop"]) {
  if (!appCode.includes(`${profile}:`)) {
    throw new Error(`Enterprise profile ${profile} is missing.`);
  }
}

for (const marker of ["llm-admin-form", "llm-provider-input", "llm-endpoint-input"]) {
  const indexHtml = await readFile(resolve(root, "index.html"), "utf8");
  if (!indexHtml.includes(marker)) {
    throw new Error(`LLM admin marker ${marker} is missing.`);
  }
}

const gatewayCode = await readFile(resolve(root, "llm-gateway/main.py"), "utf8");
for (const provider of ["onprem", "openai", "anthropic", "gemini"]) {
  if (!gatewayCode.includes(`"${provider}"`)) {
    throw new Error(`LLM gateway provider ${provider} is missing.`);
  }
}

console.log(`Validated ${requiredFiles.length} static production files.`);
