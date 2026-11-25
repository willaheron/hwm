/* Highwater service worker — network-first with a short timeout, cache fallback for offline. */
const CACHE = "highwater-cache";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
const TIMEOUT = 2500;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(networkFirst(e.request));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const net = await Promise.race([
      fetch(req),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), TIMEOUT))
    ]);
    if (net && net.ok) cache.put(req, net.clone());
    return net;
  } catch (err) {
    const cached = await cache.match(req);
    if (cached) return cached;
    const home = await cache.match("./index.html");
    if (home) return home;
    throw err;
  }
}
