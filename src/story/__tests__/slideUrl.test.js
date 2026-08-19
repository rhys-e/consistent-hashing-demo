import { hashFor, indexForHash, slugFor, titleFor } from '../slideUrl';

const SLIDES = [
  { kind: 'interstitial', key: 'intro', title: 'Where does a key live?' },
  { kind: 'scene', key: 'hash-space' },
  { kind: 'scene', key: 'key-routes' },
];

describe('slide addresses', () => {
  it('names a slide by its own key', () => {
    expect(slugFor(SLIDES[2])).toBe('key-routes');
    expect(hashFor(SLIDES[2])).toBe('#/key-routes');
  });

  /**
   * The leading slash is what keeps a fragment from naming an element. Without it
   * `#intro` is an anchor, and a browser landing on it goes looking for something
   * to scroll to.
   */
  it('writes a fragment that cannot be mistaken for an anchor', () => {
    expect(hashFor(SLIDES[0]).startsWith('#/')).toBe(true);
    expect(indexForHash(SLIDES, '#intro')).toBeNull();
  });

  it('finds the slide a fragment names', () => {
    expect(indexForHash(SLIDES, '#/intro')).toBe(0);
    expect(indexForHash(SLIDES, '#/key-routes')).toBe(2);
  });

  /**
   * Null rather than 0: "no slide" and "the first slide" are different answers,
   * and only the caller knows whether a wrong address should be corrected or left
   * alone.
   */
  it('says nothing rather than guessing', () => {
    expect(indexForHash(SLIDES, '#/does-not-exist')).toBeNull();
    expect(indexForHash(SLIDES, '')).toBeNull();
    expect(indexForHash(SLIDES, undefined)).toBeNull();
  });

  it('survives an encoded fragment', () => {
    expect(indexForHash(SLIDES, '#/key%2Droutes')).toBe(2);
  });

  /** A back button offering nine identical entries is a menu of nothing. */
  it('titles a slide, falling back to its key when it has none', () => {
    expect(titleFor(SLIDES[0], 'Site')).toBe('Site — Where does a key live?');
    expect(titleFor(SLIDES[2], 'Site')).toBe('Site — Key routes');
  });

  it('round-trips every slide in the real story', async () => {
    const { STORY_SLIDES } = await import('../../components/deck/Story');

    STORY_SLIDES.forEach((slide, index) => {
      expect(indexForHash(STORY_SLIDES, hashFor(slide))).toBe(index);
    });
    expect(new Set(STORY_SLIDES.map(slugFor)).size).toBe(STORY_SLIDES.length);
  });
});
