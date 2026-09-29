/// <reference lib="esnext" />
/// <reference lib="webworker" />
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, Serwist, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Deliberately NOT using @serwist/turbopack/worker's `defaultCache`: its document/RSC NetworkFirst
// rules cache this app's authenticated, per-request-dynamic page responses, which is incompatible with
// Next.js App Router hydration here — confirmed by reproducing a hydration failure (React error #418)
// on every production load of /games/[gameId] that vanished entirely in dev mode (where defaultCache is
// NetworkOnly). A stale/mismatched cached document can desync client state built on top of it, so
// nothing that varies per navigation is cached — only genuinely static, content-hashed build assets
// (already covered by `precacheEntries` below) plus a couple of runtime rules for anything not
// precached. No document caching means a never-before-visited-while-online game route simply fails
// offline with the browser's native error, which is an acceptable trade-off against a confirmed
// correctness bug; see docs/ARCHITECTURE.md's Phase 6 entry.
const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: /\.(?:woff2?|ttf|otf|eot)$/i,
    handler: new CacheFirst({
      cacheName: "static-fonts",
      plugins: [new ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 30 * 24 * 60 * 60 })],
    }),
  },
  {
    matcher: /\.(?:png|jpg|jpeg|gif|svg|ico|webp)$/i,
    handler: new StaleWhileRevalidate({
      cacheName: "static-images",
      plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 30 * 24 * 60 * 60 })],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching,
});

serwist.addEventListeners();
