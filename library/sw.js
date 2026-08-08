/* The Library — static build service worker.
   CACHE is stamped from the build content, so it changes whenever the app
   does. Bumping it by hand was the step everyone forgets, and forgetting it
   means the phone silently keeps serving the old app.

   THE HTML IS NETWORK-FIRST AND MUST STAY THAT WAY. It used to be cache-first
   like everything else, and the result was that three rounds of real fixes —
   the track picker, the hearts, the whole interaction layer — shipped, went
   live, and were never once seen on the phone. A home-screen PWA kept handing
   back the shell it cached weeks earlier, and the app looked broken while the
   host was serving the fix. Cache-first HTML on an installed PWA is
   indistinguishable from not deploying at all.

   Everything else stays cache-first: the audio is ~5MB and immutable per
   build, and paying the network for it on every launch is the reason to have
   a service worker in the first place. */
const CACHE = "library-static-24f023e267";
const SHELL = ["./", "./index.html", "./manifest.webmanifest",
               "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

/* A same-origin GET whose answer is the app itself rather than an asset. */
function isAppShell(req) {
  if (req.mode === "navigate") return true;
  const p = new URL(req.url).pathname;
  return p.endsWith("/") || p.endsWith("/index.html");
}

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE)
    .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {}))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

/* The page asks for this after a controller change so it can tell whether the
   worker that just took over is actually newer than the HTML it is running. */
self.addEventListener("message", (e) => {
  if (e.data !== "version") return;
  /* Reply down the transferred port when there is one; fall back to the client
     itself, because a worker that took over via clients.claim() can be asked
     before the page has wired a channel. */
  if (e.ports && e.ports[0]) e.ports[0].postMessage({ stamp: "24f023e267" });
  else if (e.source) e.source.postMessage({ stamp: "24f023e267" });
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  if (isAppShell(req)) {
    /* Network first, cache as the offline floor. A stale shell is worth
       serving when there is no signal; it is never worth serving when there
       is one. */
    e.respondWith(
      fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
    );
    return;
  }

  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res && res.status === 200) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return res;
  }).catch(() => hit)));
});
