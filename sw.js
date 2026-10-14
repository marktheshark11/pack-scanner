// Network-first: new deployments show up right away; the cache is only a fallback when offline.
const V = "pack-scanner-v1";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(["/", "/manifest.webmanifest", "/icons/icon-192.png"])).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api/")) return;
  e.respondWith(
    fetch(e.request)
      .then((r) => { if (r.ok) { const c = r.clone(); caches.open(V).then((x) => x.put(e.request, c)); } return r; })
      .catch(() => caches.match(e.request).then((m) => m || caches.match("/")))
  );
});
