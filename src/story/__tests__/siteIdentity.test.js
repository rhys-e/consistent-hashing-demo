import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The repository is public and the deployment is not interesting to it, so the
 * host it is served from and the person who wrote it arrive at build time rather
 * than living in the source. This is the check that keeps it that way: it is very
 * easy to paste a real URL into a meta tag and never notice.
 *
 * Written as "no absolute URLs except these", rather than as a search for the
 * actual host — a test that names the thing it is hiding would defeat itself.
 */
const ROOT = join(__dirname, '..', '..', '..');

/** Hosts a committed file may name, because none of them is the deployment. */
const ALLOWED = [
  'schema.org', // the vocabulary a structured-data block is written in
  'fonts.googleapis.com', // the stylesheet, named in the CSP and the import
  'fonts.gstatic.com', // where that stylesheet fetches its files from
  'www.sitemaps.org', // the sitemap's XML namespace
  'localhost', // the build's own fallback
];

const files = ['index.html', ...readdirSync(join(ROOT, 'seo')).map(name => join('seo', name))];

// The delimiter set has to include `;` and `,`: the CSP lists its hosts separated
// by them, and a hostname carrying a trailing semicolon matches nothing on the
// allow-list and reads as a leak.
const urlsIn = text => [...text.matchAll(/https?:\/\/([^/"'\s;,)]+)/g)].map(match => match[1]);

describe('the deployment host', () => {
  it('has files to check', () => {
    expect(files.length).toBeGreaterThan(2);
  });

  it.each(files)('is not written into %s', file => {
    const found = urlsIn(readFileSync(join(ROOT, file), 'utf8')).filter(
      host => !ALLOWED.some(allowed => host === allowed || host.endsWith(`.${allowed}`))
    );

    expect(found).toEqual([]);
  });

  /** The tokens have to actually be there, or the check above passes vacuously. */
  it('is left as a token for the build to fill in', () => {
    const html = readFileSync(join(ROOT, 'index.html'), 'utf8');

    expect(html).toContain('%SITE_URL%');
    expect(html).toContain('%SITE_AUTHOR%');
    expect(readFileSync(join(ROOT, 'seo', 'sitemap.xml'), 'utf8')).toContain('%SITE_URL%');
    expect(readFileSync(join(ROOT, 'seo', 'robots.txt'), 'utf8')).toContain('%SITE_URL%');
  });
});
