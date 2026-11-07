const CACHE = 'matw-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  if (new URL(req.url).origin !== self.location.origin) return

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copie = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copie))
        }
        return res
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('/')))
  )
})
