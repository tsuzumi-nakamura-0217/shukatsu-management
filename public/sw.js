/// Service Worker for 就活マネージャー PWA

const CACHE_NAME = 'shukatsu-manager-v1';

// キャッシュするアセット（アプリシェル）
const PRECACHE_ASSETS = [
  '/',
  '/icon-192x192.svg',
  '/icon-512x512.svg',
  '/manifest.json',
];

// インストール: プリキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // 新しいSWをすぐにアクティブにする
  self.skipWaiting();
});

// アクティベート: 旧キャッシュのクリーンアップ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // すべてのクライアントをすぐにコントロール
  self.clients.claim();
});

// フェッチ: Network First戦略（APIやページはネットワーク優先、失敗時キャッシュフォールバック）
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // POSTリクエストなどはキャッシュ対象外
  if (request.method !== 'GET') return;

  // API呼び出しは常にネットワーク優先
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // その他のリクエスト: Network First + キャッシュ更新
  event.respondWith(
    fetch(request)
      .then((response) => {
        // レスポンスをキャッシュに保存
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // オフライン時はキャッシュから返す
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // キャッシュにもない場合はオフラインページ（将来的に追加可能）
          return new Response('オフラインです。インターネット接続を確認してください。', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' }),
          });
        });
      })
  );
});
