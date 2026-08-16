import { STORY_SLIDES } from '../../components/Story';
import { HASH_SPACE_BEATS } from '../../components/HashSpaceScene';
import { LOOKUP_BEATS } from '../../components/LookupRing';
import { REMOVAL_BEATS } from '../../components/RemovalRing';
import { SPREAD_BEATS } from '../../components/SpreadRing';
import { ZOOM_BEATS } from '../../components/DensityZoom';
import { LANE_BEATS } from '../../components/FullScaleLanes';

/**
 * The house rules for everything a viewer reads.
 *
 * Taken from ASD-STE100 Simplified Technical English, minus its approved-word
 * dictionary. The dictionary is built for maintenance procedures and would cost
 * this story words it needs — *absorb*, *density*, *share*, *even* — so what is
 * adopted is the sentence-level half: one idea per sentence, a hard word limit,
 * and no construction that hides a second clause inside a first.
 *
 * Enforced rather than intended, because prose is exactly the part of a codebase
 * that drifts back. Everything here is mechanical; the rules that are not — active
 * voice, no metaphor, one term per concept — are in the review, not the test.
 */

const MAX_WORDS = 20;

const sentencesIn = text =>
  text
    .split(/(?<=[.?!])\s+/)
    .map(sentence => sentence.trim())
    .filter(Boolean);

const wordsIn = sentence => sentence.split(/\s+/).filter(Boolean).length;

const SCENE_LINES = [
  ['scene 1', HASH_SPACE_BEATS],
  ['scene 2', LOOKUP_BEATS],
  ['scene 3', REMOVAL_BEATS],
  ['scene 4', SPREAD_BEATS],
  ['scene 5', ZOOM_BEATS],
  ['scene 6/7', LANE_BEATS],
].flatMap(([scene, beats]) =>
  [...(beats.annotations ?? []), ...(beats.narrations ?? [])]
    .filter(entry => entry.text)
    .map(entry => [`${scene}: ${entry.text}`, entry.text])
);

const SLIDE_LINES = STORY_SLIDES.filter(slide => slide.kind === 'interstitial').flatMap(slide => [
  [`title: ${slide.title}`, slide.title],
  ...slide.body.map(paragraph => [`${slide.key}: ${paragraph.slice(0, 40)}…`, paragraph]),
]);

const EVERYTHING = [...SLIDE_LINES, ...SCENE_LINES];

describe('the words a viewer reads', () => {
  it('has something to check', () => {
    expect(SLIDE_LINES.length).toBeGreaterThan(10);
    expect(SCENE_LINES.length).toBeGreaterThan(8);
  });

  it('keeps every sentence under twenty words', () => {
    const long = EVERYTHING.flatMap(([where, text]) =>
      sentencesIn(text)
        .filter(sentence => wordsIn(sentence) > MAX_WORDS)
        .map(sentence => `${where} — ${wordsIn(sentence)} words: ${sentence}`)
    );

    expect(long).toEqual([]);
  });

  /**
   * An em-dash or a semicolon is nearly always a second sentence being smuggled
   * into a first, and a bracket is one being hidden inside it. Splitting them is
   * the single change that most reduced the reading age of this copy.
   */
  it('smuggles no second clause into a first', () => {
    const smuggled = EVERYTHING.filter(([, text]) => /[—;(]/.test(text)).map(([where]) => where);

    expect(smuggled).toEqual([]);
  });

  /**
   * One term per concept, which is the STE rule that survives longest and is
   * broken most easily. The story has three nouns and they are not
   * interchangeable:
   *
   * - a server holds **positions**, never slots or tokens or vnodes
   * - a position owns a **range**, never a span or a segment
   * - a **section** is any piece of the ring a viewer chooses to look at, which
   *   contains many ranges and belongs to nobody in particular
   *
   * `section` was briefly banned along with the range synonyms, which was wrong:
   * it names a different thing, and the scene that magnifies part of the ring has
   * no other word for what it is magnifying.
   */
  it('uses one word for a position and one for a range', () => {
    const strays = EVERYTHING.filter(([, text]) =>
      /\b(slots?|tokens?|vnodes?|virtual nodes?|spans?|segments?)\b/i.test(text)
    ).map(([where]) => where);

    expect(strays).toEqual([]);
  });

  /**
   * Four words, because of the scramble rather than the writing. A proportional
   * heading face means a block glyph is not the width of the letter it replaces,
   * so a title set near the width of its column reflows while it resolves.
   */
  /**
   * The ring is measured in distance, and words that measure duration read as a
   * claim about time. "No server holds it for long" sounds like a server letting
   * go after a while; the claim is about how little of the ring it holds at once.
   * This has been written twice and corrected twice, which is what a test is for.
   */
  it('measures the ring in distance, not in time', () => {
    const temporal = EVERYTHING.filter(([, text]) =>
      /\bfor long\b|\bfor a while\b|\bat a time\b|\bbriefly\b/i.test(text)
    ).map(([where]) => where);

    expect(temporal).toEqual([]);
  });

  it('titles a slide in four words or fewer', () => {
    STORY_SLIDES.filter(slide => slide.title).forEach(slide => {
      expect(wordsIn(slide.title)).toBeLessThanOrEqual(4);
    });
  });

  /**
   * Short sentences want fewer paragraphs, not more. Splitting each pair into its
   * own block turned the slides into a list of fragments with a gap between every
   * one — the sentence limit is a limit on sentences, and STE allows six of them
   * in a descriptive paragraph.
   */
  it('gathers short sentences into two paragraphs', () => {
    STORY_SLIDES.filter(slide => slide.body).forEach(slide => {
      expect(slide.body.length).toBe(2);
    });
  });

  /**
   * Every paragraph fills the same measure.
   *
   * The column has a fixed width, so a paragraph shorter than about two and a half
   * lines stops before the right edge and the block stops reading as one column.
   * This is the rule that is easiest to break by editing one sentence, and the
   * hardest to see in a diff.
   */
  it('writes paragraphs of one length', () => {
    const lengths = STORY_SLIDES.filter(slide => slide.body).flatMap(slide =>
      slide.body.map(paragraph => [`${slide.key}: ${paragraph.length}ch`, paragraph.length])
    );

    lengths.forEach(([where, length]) => {
      expect({ where, tooShort: length < 140 }).toEqual({ where, tooShort: false });
      expect({ where, tooLong: length > 190 }).toEqual({ where, tooLong: false });
    });
  });
});
