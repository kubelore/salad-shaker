// Service worker: gør Salad shaker installerbar og lader den virke uden net.
// Sidens egne filer hentes fra nettet først (så rettelser slår igennem med det samme) og gemmes til offline.
// Billeder og skrifttyper vises fra lageret med det samme og opdateres i baggrunden.
const LAGER = "salad-shaker-v1";
const KERNE = ["/", "index.html", "style.css", "app.js", "ingredienser.json", "manifest.webmanifest",
  "icon-192.png", "icon-512.png", "apple-touch-icon.png", "favicon-32.png"];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const lager = await caches.open(LAGER);
    await lager.addAll(KERNE);
    // Hent alle ingrediensbilleder, så Shake også virker offline. Fejler et billede, går resten igennem.
    try {
      const data = await (await lager.match("ingredienser.json")).json();
      const billeder = data.kategorier.flatMap((k) => k.ingredienser.map((i) => i.billede).filter(Boolean));
      await Promise.allSettled(billeder.map((b) => lager.add(b)));
    } catch (fejl) {}
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const navn of await caches.keys()) if (navn !== LAGER) await caches.delete(navn);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const egen = url.origin === location.origin;
  if (egen && req.mode === "navigate") e.respondWith(netFoerst(req, "/"));
  else if (egen && url.pathname.startsWith("/billeder/")) e.respondWith(lagerFoerst(e, req));
  else if (egen) e.respondWith(netFoerst(req));
  else if (url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com")) e.respondWith(lagerFoerst(e, req));
});

// Nettet først; uden net bruges den gemte udgave. Siden gemmes uden ?s=..., så alle del-links virker offline.
async function netFoerst(req, noegle) {
  const lager = await caches.open(LAGER);
  try {
    const svar = await fetch(req);
    if (svar.ok) await lager.put(noegle || req, svar.clone());
    return svar;
  } catch (fejl) {
    const gemt = await lager.match(noegle || req, { ignoreSearch: true });
    if (gemt) return gemt;
    throw fejl;
  }
}

// Lageret først, og opdatér i baggrunden.
async function lagerFoerst(e, req) {
  const lager = await caches.open(LAGER);
  const gemt = await lager.match(req);
  const nyt = fetch(req).then((svar) => {
    if (svar.ok || svar.type === "opaque") return lager.put(req, svar.clone()).then(() => svar);
    return svar;
  });
  if (gemt) {
    e.waitUntil(nyt.catch(() => {}));
    return gemt;
  }
  return nyt;
}
