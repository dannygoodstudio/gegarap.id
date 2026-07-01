/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don't advertise the framework (tiny header saving + one less fingerprint).
  poweredByHeader: false,
  // Serve modern formats from next/image when a component uses it. AVIF first,
  // WebP fallback — both dramatically smaller than JP/PNG for the same quality.
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // Enable the `src/instrumentation.ts` hook (Sentry init, Bagian 10). On
  // Next 14.2 this is still behind an experimental flag (default from 15).
  experimental: {
    instrumentationHook: true,
    // Barrel-import tree-shaking. framer-motion (and lucide-react) re-export
    // hundreds of symbols from a single entry; without this, importing one icon
    // can pull the whole module graph into a route's chunk. This rewrites the
    // imports to their deep paths so only what's used is bundled — smaller
    // client chunks + faster cold compiles. (lucide-react is auto-optimized by
    // Next 14.2, listed here for explicitness alongside framer-motion.)
    optimizePackageImports: ['lucide-react', 'framer-motion'],
    // firebase-admin (and its transitive deps) must NOT be webpack-bundled, or a
    // pure-ESM transitive dep gets require()'d in the Vercel serverless runtime
    // and throws ERR_REQUIRE_ESM. Externalizing leaves it as a native node
    // require from node_modules (nft traces it into the lambda). Fixes every
    // server route that touches Firebase Admin (auth/session/providers/etc.).
    serverComponentsExternalPackages: ['firebase-admin'],
  },
  // Let Firebase's Google sign-in popup keep a handle to its opener so
  // window.closed/window.close() work — otherwise the browser's default COOP
  // blocks them, spamming "Cross-Origin-Opener-Policy would block..." warnings
  // and making the popup-close detection flaky. `same-origin-allow-popups` is
  // the value Firebase recommends for OAuth-popup apps.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' }],
      },
    ];
  },
};

export default nextConfig;
