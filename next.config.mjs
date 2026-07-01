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
  // Security + isolation headers applied to every response.
  //
  // COOP: `same-origin-allow-popups` (not the stricter `same-origin`) so
  // Firebase's Google sign-in popup keeps a handle to its opener — otherwise the
  // browser blocks window.closed/window.close(), spamming COOP warnings and
  // making popup-close detection flaky. This is the value Firebase recommends
  // for OAuth-popup apps.
  //
  // The rest are the standard "Helmet"-equivalent hardening set. Deliberately NO
  // Content-Security-Policy here: a correct CSP for this app has to allowlist
  // Firebase/Google, Midtrans (sandbox + prod), Supabase, and Leaflet tiles, and
  // shipping one blind would break checkout and auth. That belongs in its own
  // staged, report-only-first change. Permissions-Policy only locks down camera
  // and microphone (verified unused); geolocation/payment are left permissive so
  // the map and Midtrans Snap keep working.
  async headers() {
    const securityHeaders = [
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=()' },
    ];
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
