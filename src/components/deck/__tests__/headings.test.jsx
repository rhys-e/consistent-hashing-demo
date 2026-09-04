import React from 'react';
import { act, render } from '@testing-library/react';

import StoryDeck from '../StoryDeck';
import { STORY_SLIDES } from '../Story';

/**
 * All fourteen slides are in the document at once, so the deck's headings are the
 * page's heading outline whether or not anybody wrote them as one. It had fourteen
 * `h2`s and no `h1`, which is a document with no title and seven equal chapters.
 */
describe('the heading outline', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  /**
   * Rendered, then given long enough for the opening title to resolve.
   *
   * The slide the deck opens on scrambles its heading one glyph at a time, so at
   * the first frame the `h1` reads `*C}/}}-▞*C }#]-`. That is the viewer's
   * experience and not a defect, but it is not the heading outline, and a crawler
   * arriving before it settles is exactly the hazard `scripts/prerender.mjs`
   * guards against.
   */
  const rendered = () => {
    const { container } = render(<StoryDeck slides={STORY_SLIDES} />);
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    return container;
  };

  it('gives the page exactly one h1, and it is the slide the story opens on', () => {
    const container = rendered();
    const headings = [...container.querySelectorAll('h1')];

    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe(STORY_SLIDES.find(slide => slide.lead).title);
  });

  /**
   * The absolutely-positioned heading needs something holding its height open, and
   * that spacer used to be a second `h2` carrying the same words. `aria-hidden`
   * kept it from a screen reader and did nothing about anything that parses markup.
   */
  it('states every title once, not once per copy of it', () => {
    const container = rendered();
    const titles = STORY_SLIDES.filter(slide => slide.title).map(slide => slide.title);
    const headings = [...container.querySelectorAll('h1, h2')].map(node => node.textContent);

    expect(headings).toHaveLength(titles.length);
    titles.forEach(title => {
      expect(headings.filter(text => text === title)).toHaveLength(1);
    });
  });

  /** Every interstitial contributes a heading, so the outline covers the story. */
  it('leaves no titled slide out of the outline', () => {
    const container = rendered();
    const headings = [...container.querySelectorAll('h1, h2')].map(node => node.textContent);

    STORY_SLIDES.filter(slide => slide.title).forEach(slide => {
      expect(headings).toContain(slide.title);
    });
  });
});
