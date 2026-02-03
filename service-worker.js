const CACHE_NAME = "kirkit-v1";

const ASSETS = [
  "/",
  "/index.html",
  "/script.js",
  "/app.js",
  "/end.js",
  "/fj.js",
  "/inning-over.js",
  "/end.css",
  "/inning-over.css",
  "/match.html",
  "/team.html",
  "/input.html",
  "/match_summary.html",
  "/oversummary.html",
  "/matchover.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// Install
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// Fetch
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});
