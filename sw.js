// Service worker: funzionamento offline dell'app e ricezione delle notifiche push.
const CACHE = "casa-vacanze-v1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/badge-96.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (req.mode === "navigate") {
    // Prima la rete (così vedi sempre l'ultima versione), poi la copia salvata se sei offline
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("./index.html", copy)); return res; })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});

// Notifica inviata dallo script "promemoria" (messaggio FCM con solo dati)
self.addEventListener("push", (e) => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch { p = { data: { body: e.data && e.data.text() } }; }
  const d = p.data || {};
  const n = p.notification || {};
  const title = n.title || d.title || "Casa Vacanze";
  const url = new URL(d.url || "./", self.registration.scope).href;
  e.waitUntil(
    self.registration.showNotification(title, {
      body: n.body || d.body || "",
      icon: "icons/icon-192.png",
      badge: "icons/badge-96.png",
      tag: d.tag || undefined,
      renotify: Boolean(d.tag),
      data: { url }
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.registration.scope) && "focus" in c) { c.navigate(url).catch(() => {}); return c.focus(); }
      }
      return self.clients.openWindow(url);
    })
  );
});
