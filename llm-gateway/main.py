import json
import os
import re
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    provider: str = Field(default="onprem")
    model: str | None = None
    temperature: float = Field(default=0.2, ge=0, le=1)
    formData: dict[str, Any]
    profile: dict[str, Any]
    schema: dict[str, Any]


app = FastAPI(title="Enterprise Presentation LLM Gateway", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ALLOW_ORIGINS", "*").split(","),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def model_for(provider: str, requested: str | None) -> str:
    if requested:
        return requested
    defaults = {
        "onprem": env("ONPREM_LLM_MODEL", "llama3.1"),
        "openai": env("OPENAI_MODEL", "gpt-4.1-mini"),
        "anthropic": env("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest"),
        "gemini": env("GEMINI_MODEL", "gemini-1.5-pro"),
    }
    return defaults.get(provider, requested or "")


def build_prompt(request: GenerateRequest) -> str:
    form = request.formData
    return f"""
Erzeuge ein JSON-Objekt fuer ein Enterprise-Praesentationsdeck.
Antworte ausschliesslich mit validem JSON, ohne Markdown und ohne Kommentartext.

Pflichtstruktur:
{{
  "title": "...",
  "tags": ["..."],
  "sources": [{{"label": "Quelle 1", "text": "..."}}],
  "slides": [
    {{"id": "s1-title", "type": "title", "title": "...", "subtitle": "...", "bullets": ["..."]}}
  ]
}}

Erlaubte Folientypen: {", ".join(request.schema.get("slideTypes", []))}
Profil: {json.dumps(request.profile, ensure_ascii=False)}
Zielgruppe: {form.get("audience")}
Organisationseinheit: {form.get("owner")}
Klassifizierung intern: {form.get("confidential")}
Gewuenschte Folienanzahl: {form.get("count")}
Ton und Struktur: {form.get("style")}
Briefing:
{form.get("brief")}

Quellen, Daten oder Kontext:
{form.get("context") or "Keine Quellen angegeben. Quellenfolie mit Hinweis erzeugen."}

Regeln:
- Nutze nur erlaubte Folientypen.
- Erzeuge genau die gewuenschte Anzahl Folien, soweit fachlich sinnvoll.
- Fuege bei Entscheidungs- oder Managementprofilen eine decision-Folie ein.
- Fuege bei vorhandenen Quellen oder Quellenpflicht eine sources-Folie ein.
- Halte Bullet Points kurz und pruefbar.
- Keine HTML-Tags, keine Markdown-Tabellen, keine externen URLs erfinden.
""".strip()


def parse_json_object(text: str) -> dict[str, Any]:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```(?:json)?\s*", "", stripped)
        stripped = re.sub(r"\s*```$", "", stripped)
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", stripped, flags=re.DOTALL)
        if not match:
            raise
        return json.loads(match.group(0))


async def call_openai_compatible(
    base_url: str,
    api_key: str,
    model: str,
    prompt: str,
    temperature: float,
) -> str:
    url = base_url.rstrip("/") + "/chat/completions"
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    payload = {
        "model": model,
        "temperature": temperature,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": "Du erzeugst ausschliesslich valides JSON fuer Praesentationen."},
            {"role": "user", "content": prompt},
        ],
    }
    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
    return data["choices"][0]["message"]["content"]


async def call_anthropic(model: str, prompt: str, temperature: float) -> str:
    api_key = env("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY is not configured")
    payload = {
        "model": model,
        "max_tokens": int(env("ANTHROPIC_MAX_TOKENS", "6000")),
        "temperature": temperature,
        "system": "Du erzeugst ausschliesslich valides JSON fuer Praesentationen.",
        "messages": [{"role": "user", "content": prompt}],
    }
    headers = {
        "anthropic-version": env("ANTHROPIC_VERSION", "2023-06-01"),
        "content-type": "application/json",
        "x-api-key": api_key,
    }
    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
    return "".join(part.get("text", "") for part in data.get("content", []) if part.get("type") == "text")


async def call_gemini(model: str, prompt: str, temperature: float) -> str:
    api_key = env("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured")
    base_url = env("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")
    url = f"{base_url.rstrip('/')}/models/{model}:generateContent"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "responseMimeType": "application/json",
        },
    }
    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post(url, params={"key": api_key}, json=payload)
        response.raise_for_status()
        data = response.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]


async def generate_with_provider(request: GenerateRequest) -> tuple[dict[str, Any], str]:
    provider = request.provider.lower()
    model = model_for(provider, request.model)
    prompt = build_prompt(request)

    if provider == "openai":
        text = await call_openai_compatible(
            env("OPENAI_BASE_URL", "https://api.openai.com/v1"),
            env("OPENAI_API_KEY"),
            model,
            prompt,
            request.temperature,
        )
    elif provider == "anthropic":
        text = await call_anthropic(model, prompt, request.temperature)
    elif provider == "gemini":
        text = await call_gemini(model, prompt, request.temperature)
    elif provider == "onprem":
        text = await call_openai_compatible(
            env("ONPREM_LLM_BASE_URL", "http://ollama:11434/v1"),
            env("ONPREM_LLM_API_KEY"),
            model,
            prompt,
            request.temperature,
        )
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")

    return parse_json_object(text), model


@app.get("/api/llm/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "providers": ["onprem", "openai", "anthropic", "gemini"],
        "default_provider": env("DEFAULT_LLM_PROVIDER", "onprem"),
    }


@app.post("/api/llm/generate")
async def generate(request: GenerateRequest) -> dict[str, Any]:
    provider = request.provider or env("DEFAULT_LLM_PROVIDER", "onprem")
    request.provider = provider
    try:
        deck, model = await generate_with_provider(request)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"Provider error: {exc.response.status_code}") from exc
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="Provider did not return valid JSON") from exc
    return {"deck": deck, "provider": provider, "model": model}
