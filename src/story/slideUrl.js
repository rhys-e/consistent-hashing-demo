/**
 * Which slide the address bar is pointing at, and what it should say.
 *
 * Kept apart from the deck because it is entirely a question about strings, and
 * because the interesting decisions are ones a component would bury.
 *
 * **A fragment, not a path.** `#/key-routes` needs no rewrite rule at the host, so
 * a link to the middle of the story works from a static bucket, from a file, and
 * from a preview build. The leading slash is there so the fragment can never
 * collide with the id of an element on the page and send the browser looking for
 * something to scroll to.
 *
 * **The slug is the slide's own key.** They were already kebab-case and already
 * unique — inventing a second name for the same thing is how the two drift.
 */

const PREFIX = '#/';

export const slugFor = slide => slide.key;

export const hashFor = slide => `${PREFIX}${slugFor(slide)}`;

/**
 * The slide a fragment names, or `null` if it names nothing.
 *
 * Null rather than 0, because "no slide" and "the first slide" are different
 * answers and only the caller knows whether a wrong address should be corrected
 * or ignored.
 */
export function indexForHash(slides, hash) {
  if (typeof hash !== 'string' || !hash.startsWith(PREFIX)) return null;

  const slug = decodeURIComponent(hash.slice(PREFIX.length));
  const index = slides.findIndex(slide => slugFor(slide) === slug);

  return index === -1 ? null : index;
}

const humanise = key => key.replace(/-/g, ' ').replace(/^./, first => first.toUpperCase());

/**
 * What the browser tab and the history entry say.
 *
 * Worth doing precisely because deliberate moves push history: a back button
 * offering nine identical entries is a menu of nothing.
 */
export function titleFor(slide, siteTitle) {
  return `${siteTitle} — ${slide.title ?? humanise(slide.key)}`;
}
