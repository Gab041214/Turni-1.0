// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        // IMPORTANTE: senza questo, il plugin genera sw.js in "dist/" (cartella intermedia
        // di Vite), che Nitro NON copia in .output/public (la cartella servita davvero da
        // Cloudflare). Risultato: /sw.js risponde con l'HTML dell'app invece del vero
        // service worker, la registrazione fallisce in silenzio e l'offline non funziona mai.
        outDir: ".output/public",
        devOptions: { enabled: false },
        manifest: false,
        workbox: {
          globPatterns: ["**/*.{js,css,html,png,svg,webmanifest}"],
          // Il plugin ha 'index.html' come default SEMPRE attivo per navigateFallback
          // (fuso via Object.assign con le nostre opzioni): omettere semplicemente questa
          // chiave NON basta a disattivarlo, va sovrascritta esplicitamente con undefined.
          // Senza questo, il Service Worker genera una NavigationRoute che punta a un file
          // precaricato "index.html" mai esistito (questa app è renderizzata dal server, non
          // un sito statico) — il SW va in errore all'attivazione e l'offline non funziona mai.
          navigateFallback: undefined,
          runtimeCaching: [
            {
              urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "html-navigations",
                networkTimeoutSeconds: 5,
              },
            },
            {
              urlPattern: ({ request, sameOrigin }: { request: Request; sameOrigin: boolean }) =>
                sameOrigin &&
                (request.destination === "script" ||
                  request.destination === "style" ||
                  request.destination === "font" ||
                  request.destination === "image"),
              handler: "CacheFirst",
              options: {
                cacheName: "static-assets",
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
  },
});
