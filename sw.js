/* Modo sin conexión: siempre intenta traer lo más nuevo y, si no hay señal,
   muestra la última versión guardada. No toca la planilla de Google. */
const CACHE = "proyecto-alemania-v23";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const propio = url.origin === self.location.origin;
  const fuentes = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!propio && !fuentes) return;
  e.respondWith(
    (propio ? fetch(req.url, { cache: "no-cache" }) : fetch(req)).then((res) => {
      if (res.ok) { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: propio }).then((r) => r || caches.match("./")))
  );
});
