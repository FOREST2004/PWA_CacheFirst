importScripts(
    'https://storage.googleapis.com/workbox-cdn/releases/7.3.0/workbox-sw.js'
);


const CACHE_NAME = 'cache-first-demo-v1';
const API_CACHE_NAME = 'api-cache-v1';


const { precacheAndRoute, cleanupOutdatedCaches } = workbox.precaching;
const { registerRoute } = workbox.routing;
const { CacheFirst, NetworkFirst, StaleWhileRevalidate } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;


precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();


registerRoute(
  ({ request }) => 
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image',
  new CacheFirst({
    cacheName: 'static-resources',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);


registerRoute(
  ({ url }) => url.origin === 'https://jsonplaceholder.typicode.com',
  new CacheFirst({
    cacheName: API_CACHE_NAME,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
);


registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
    ],
  })
);


registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' ||
              url.origin === 'https://fonts.gstatic.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
      }),
    ],
  })
);


self.addEventListener('widgetinstall', (event) => {
    event.waitUntil(updateWidget(event));
});

self.addEventListener('widgetresume', (event) => {
    event.waitUntil(updateWidget(event));
});

self.addEventListener('widgetclick', (event) => {
    if (event.action == "updateName") {
        event.waitUntil(updateName(event));
    }
});

self.addEventListener('widgetuninstall', (event) => {});

const updateWidget = async (event) => {
    const widgetDefinition = event.widget.definition;
    const payload = {
        template: JSON.stringify(await (await fetch(widgetDefinition.msAcTemplate)).json()),
        data: JSON.stringify(await (await fetch(widgetDefinition.data)).json()),
    };
    await self.widgets.updateByInstanceId(event.instanceId, payload);
}

const updateName = async (event) => {
    const name = event.data.json().name;
    const widgetDefinition = event.widget.definition;
    const payload = {
        template: JSON.stringify(await (await fetch(widgetDefinition.msAcTemplate)).json()),
        data: JSON.stringify({name}),
    };
    await self.widgets.updateByInstanceId(event.instanceId, payload);
}

// Background sync for offline actions (optional enhancement)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-cached-data') {
    event.waitUntil(syncCachedData());
  }
});

async function syncCachedData() {
  // Sync cached data when back online
  console.log('Syncing cached data...');
}

// Show notification when app updates
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Log cache strategy in action
self.addEventListener('fetch', event => {
  // Log for debugging cache strategy
  if (event.request.url.includes('jsonplaceholder')) {
    console.log('Cache First: API request for', event.request.url);
  }
});