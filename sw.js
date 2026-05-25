const CACHE_NAME = "present-html-bund-v5";

const APP_SHELL = [
  "./",
  "./index.html",
  "./app.css",
  "./app.js",
  "./manifest.webmanifest",
  "./health.json",
  "./schemas/deck.schema.json",
  "./themes/bund/theme.json",
  "./assets/bund-mark.svg",
  "./presentations/on-prem-framework/",
  "./presentations/on-prem-framework/index.html",
  "./presentations/on-prem-framework/custom.css",
  "./vendor/reveal.js/dist/reset.css",
  "./vendor/reveal.js/dist/reveal.css",
  "./vendor/reveal.js/dist/reveal.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }
  if (requestUrl.pathname.startsWith("/api/")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => {
        if (cached) {
          return cached;
        }

        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }

        return new Response("Ressource nicht offline verfügbar.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      }))
  );
});
