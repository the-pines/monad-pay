// public/sw.js
const VERSION = 'v1';
const ASSET_CACHE = `assets-${VERSION}`;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => ![ASSET_CACHE].includes(k))
            .map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

// Cache static assets (Next outputs under _next/)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Cache-first for Next static assets
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/icons/')
  ) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        const resp = await fetch(req);
        cache.put(req, resp.clone());
        return resp;
      })
    );
    return;
  }

  // Network-first for navigations (pages)
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch {
          // Optional: offline fallback page if you add one
          const cached = await caches.match('/offline');
          return cached || new Response('offline', { status: 200 });
        }
      })()
    );
  }
});
