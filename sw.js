const CACHE_NAME = 'gemini-translator-v5.8.0';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './styles.css',
    './worker.js',
    './icons.js',
    './manifest.json',
    './icon-192.png',
    './icon-maskable-192.png',
    './icon-512.png',
    './icon-maskable-512.png',
    './apple-touch-icon.png',
    './favicon.png',
    './splitter.js',
    './merger.js',
    './epub_studio_ui.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    'https://cdn.jsdelivr.net/npm/jepub/dist/jepub.min.js',
    'https://cdn.jsdelivr.net/npm/ejs@3.1.9/ejs.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js',
    'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
                console.warn('Service worker cache.addAll non-critical warning:', err);
            });
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // Prevent caching of translation API calls
    if (url.includes('api.deepl.com') ||
        url.includes('generativelanguage.googleapis.com') ||
        url.includes('googleapis.com') ||
        url.includes('api.deepseek.com') ||
        url.includes('api.openai.com') ||
        url.includes('api.anthropic.com') ||
        url.includes('libretranslate')) {
        return;
    }

    // NETWORK-FIRST FOR HTML DOCUMENTS TO PREVENT STALE CACHE BUGS
    if (event.request.mode === 'navigate' || url.endsWith('.html') || url.endsWith('/')) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Cache-first with network fallback for other static assets
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((response) => {
                if (event.request.method === 'GET' && (url.startsWith('http://') || url.startsWith('https://'))) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            }).catch(() => cachedResponse);
        })
    );
});
