/// <reference types="vitest" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Content Security Policy for the built app (web and store apps): only our own scripts run, and the
// app talks only to Supabase and the two place-lookup services. Left out of `npm run dev`, where
// Vite injects inline scripts for hot reload.
function csp(supabaseUrl: string | undefined): Plugin {
  const supabase = supabaseUrl ? new URL(supabaseUrl).host : '*.supabase.co';
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "media-src 'self'",
    `connect-src 'self' https://${supabase} wss://${supabase} https://api.bigdatacloud.net https://geocoding-api.open-meteo.com`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  return {
    name: 'csp',
    apply: 'build',
    transformIndexHtml: (html) => html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`),
  };
}

// Search engines and link previews need full addresses. Once the site has a domain, set VITE_SITE_URL
// (e.g. https://sanathani.app) and the build adds the canonical link, full share-image URLs,
// robots.txt with the sitemap, and sitemap.xml.
function seo(siteUrl: string | undefined): Plugin {
  const site = siteUrl?.replace(/\/+$/, '');
  return {
    name: 'seo',
    apply: 'build',
    transformIndexHtml: (html) => site
      ? html
        .replace('<meta property="og:image" content="/og-image.png" />', `<meta property="og:image" content="${site}/og-image.png" />\n    <meta property="og:url" content="${site}/" />\n    <link rel="canonical" href="${site}/" />`)
      : html,
    generateBundle() {
      const robots = `User-agent: *\nAllow: /\n${site ? `\nSitemap: ${site}/sitemap.xml\n` : ''}`;
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots });
      if (site) this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${site}/</loc><changefreq>daily</changefreq></url>\n</urlset>\n` });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // The web build for GitHub Pages lives under /sanathani/ (set by the workflow); the phone apps use /.
    base: process.env.BASE_PATH ?? '/',
    plugins: [react(), csp(env.VITE_SUPABASE_URL), seo(env.VITE_SITE_URL)],
    test: { globals: true, environment: 'node', testTimeout: 30000 },
  };
});
