// This is the "Offline page" service worker

if ('function' === typeof importScripts) {
    importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');
}

const CACHE = "pwabuilder-page";

const offlineFallbackPage = "offline.html";

self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});

self.addEventListener('install', async (event) => {
    event.waitUntil(
        caches.open(CACHE)
            .then((cache) => cache.add(offlineFallbackPage))
    );
});

self.addEventListener('fetch', async function (event) {
    if (event.request.mode === 'navigate') {
        event.respondWith((async () => {
            try {
                const preloadResp = await event.preloadResponse;

                if (preloadResp) {
                    return preloadResp;
                }

                const networkResp = await fetch(event.request);
                return networkResp;
            } catch (error) {

                const cache = await caches.open(CACHE);
                const cachedResp = await cache.match(offlineFallbackPage);
                return cachedResp;
            }
        })());
    }
});

self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'news') {
        console.log('Fetching news in the background!');
        event.waitUntil(fetchAndCacheNews());
    }
});
self.addEventListener('push', (event) => {
    const json = JSON.parse(event.data.text())
    console.log('Push Data', event.data.text())
    self.registration.showNotification(json.header, json.options)
});
