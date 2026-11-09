/* LIT 서비스 워커: 앱 껍데기만 캐시하고 API·평가 데이터는 절대 캐시하지 않습니다. */
const VERSION = "lit-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const PRECACHE = [
  "/offline.html",
  "/lit-logo.png",
  "/pwa/icon-192.png",
  "/pwa/icon-512.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // 인증이 필요한 데이터와 실시간 연결은 항상 네트워크로만 보냅니다.
  if (url.pathname.startsWith("/api/")) return;

  // 페이지 이동: 항상 최신 화면을 먼저 받고, 오프라인이면 안내 화면을 보여 줍니다.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match("/offline.html")) ?? Response.error();
      }),
    );
    return;
  }

  // 파일명에 해시가 붙은 빌드 결과물은 바뀌지 않으므로 캐시를 먼저 씁니다.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  // 그 밖의 정적 파일(이미지·아이콘)은 캐시를 보여 주면서 뒤에서 새로 받아 둡니다.
  if (/\.(?:png|svg|jpg|jpeg|webp|ico|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached ?? network;
      }),
    );
  }
});
