import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const THEME = process.env.VITE_THEME || 'holographic';

const SITE_URL = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const SITE_AUTHOR = process.env.SITE_AUTHOR || '';

const SEO_FILES = ['robots.txt', 'sitemap.xml'];

const fill = text =>
  text.replaceAll('%SITE_URL%', SITE_URL).replaceAll('%SITE_AUTHOR%', SITE_AUTHOR);

function siteIdentity() {
  return {
    name: 'site-identity',

    buildStart() {
      if (!process.env.SITE_URL) {
        this.warn(
          `SITE_URL is not set, so this build points at ${SITE_URL}. Fine for local ` +
            'work; not something to deploy.'
        );
      }
    },

    transformIndexHtml(html) {
      const withAuthor = SITE_AUTHOR ? html : html.replace(/,\s*"author":\s*\{[^}]*\}/, '');
      return fill(withAuthor);
    },

    generateBundle() {
      SEO_FILES.forEach(fileName => {
        this.emitFile({
          type: 'asset',
          fileName,
          source: fill(readFileSync(new URL(`seo/${fileName}`, import.meta.url), 'utf8')),
        });
      });
    },
  };
}

const ReactCompilerConfig = {
  sources: filename => {
    return filename.indexOf('src/') !== -1;
  },
};

export default defineConfig({
  plugins: [
    siteIdentity(),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', ReactCompilerConfig]],
      },
    }),
  ],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  define: {
    'import.meta.env.VITE_THEME': JSON.stringify(THEME),
  },
});
