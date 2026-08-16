import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import StoryDeck, { openingIndex } from '../StoryDeck';
import { COUNTDOWN_SECONDS } from '../DeckCountdown';
import { STORY_SLIDES } from '../Story';

const SLIDES = [
  { kind: 'interstitial', key: 'one', number: 'Part one', label: 'A', title: 'First', body: [] },
  { kind: 'scene', key: 'scene', render: ({ active }) => <p>{active ? 'playing' : 'idle'}</p> },
  { kind: 'interstitial', key: 'two', number: 'Part two', label: 'B', title: 'Second', body: [] },
];

const currentTick = () =>
  screen.getAllByRole('button').find(tick => tick.getAttribute('aria-current') === 'true');

/**
 * Driving the transition rather than snapping a scroll means owning every way a
 * viewer moves between slides. These are the ones that came for free before.
 */
/**
 * The countdown is the only thing standing between a viewer and a page that moves
 * on its own without warning, and it is reached through four conditions in a row —
 * settled, complete, not engaged, not last — any one of which can silently
 * withhold it. It is worth driving end to end rather than trusting the wiring.
 */
describe('story deck countdown', () => {
  const NARRATION = [
    {
      kind: 'interstitial',
      key: 'one',
      number: 'One',
      label: 'A',
      title: 'First',
      body: ['Short.'],
    },
    { kind: 'interstitial', key: 'two', number: 'Two', label: 'B', title: 'Second', body: [] },
  ];

  const runTimers = ms =>
    act(() => {
      jest.advanceTimersByTime(ms);
    });

  /**
   * `First` plus `Short.` is three words, so the slide reports itself readable at
   * 800 + 3 x 130 = 1190ms, and the deck then leaves it alone for the 1500ms dwell
   * before offering to move on.
   *
   * Written as real durations rather than round numbers because they used to be a
   * workaround: the dwell timer was scheduled by an effect, so it only started
   * when React next committed — which under fake timers was *after* the advance
   * that ran the read timer, and the test needed two advances to see it at all.
   * The deck machine schedules the dwell when the scene says it has finished, so
   * one advance is now enough and the numbers mean what they say.
   */
  const READABLE_MS = 800 + 3 * 130;
  const DWELL_MS = 1500;
  const runUntilCountdown = () => runTimers(READABLE_MS + DWELL_MS + 100);

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('appears once the slide has been readable and its dwell has passed', () => {
    render(<StoryDeck slides={NARRATION} />);

    expect(screen.queryByTestId('deck-countdown')).toBeNull();

    runTimers(READABLE_MS + 100); // the slide finishes reading
    expect(screen.queryByTestId('deck-countdown')).toBeNull();

    runTimers(DWELL_MS); // and is then left alone for a moment
    expect(screen.getByTestId('deck-countdown')).toBeTruthy();
  });

  it('gives way to a hint once the viewer takes control', () => {
    render(<StoryDeck slides={NARRATION} />);
    runUntilCountdown();
    expect(screen.getByTestId('deck-countdown')).toBeTruthy();

    fireEvent.pointerDown(screen.getAllByText('First')[0]);

    expect(screen.queryByTestId('deck-countdown')).toBeNull();
    expect(screen.getByTestId('deck-scroll-hint')).toBeTruthy();
  });

  it('never counts down on the last slide, which has nowhere to go', () => {
    render(<StoryDeck slides={NARRATION} initialIndex={1} />);
    runUntilCountdown();

    expect(screen.queryByTestId('deck-countdown')).toBeNull();
  });

  /**
   * The break-up and the countdown bar are one signal in two registers, so a
   * title that tears while nothing is about to happen would be lying.
   */
  it('breaks the title up only while the deck is about to move on', () => {
    render(<StoryDeck slides={NARRATION} />);
    const title = () => document.querySelector('.glitch-title');

    expect(title().dataset.glitching).toBe('false');

    // The bar has the slide's last few seconds to itself.
    runUntilCountdown();
    expect(title().dataset.glitching).toBe('false');

    runTimers(COUNTDOWN_SECONDS * 1000 - 1400);
    expect(title().dataset.glitching).toBe('true');
  });

  it('never breaks it up once the viewer has taken over', () => {
    render(<StoryDeck slides={NARRATION} />);
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    runUntilCountdown();
    runTimers(COUNTDOWN_SECONDS * 1000);
    expect(document.querySelector('.glitch-title').dataset.glitching).toBe('false');
  });
});

describe('story deck', () => {
  it('marks where the viewer is', () => {
    render(<StoryDeck slides={SLIDES} />);

    expect(screen.getByLabelText('Story slides')).toBeTruthy();
    expect(currentTick().getAttribute('aria-label')).toBe('First');
  });

  it.each([
    ['ArrowDown', 'Second'],
    ['PageDown', 'Second'],
  ])('moves forward on %s', key => {
    render(<StoryDeck slides={SLIDES} />);
    fireEvent.keyDown(window, { key });

    expect(currentTick().getAttribute('aria-label')).toBe('scene');
  });

  it('moves back, and stops at the ends rather than wrapping', () => {
    render(<StoryDeck slides={SLIDES} initialIndex={1} />);

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(currentTick().getAttribute('aria-label')).toBe('First');

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(currentTick().getAttribute('aria-label')).toBe('First');
  });

  it('jumps to either end', () => {
    render(<StoryDeck slides={SLIDES} />);

    fireEvent.keyDown(window, { key: 'End' });
    expect(currentTick().getAttribute('aria-label')).toBe('Second');

    fireEvent.keyDown(window, { key: 'Home' });
    expect(currentTick().getAttribute('aria-label')).toBe('First');
  });

  it('goes where a tick is clicked', () => {
    render(<StoryDeck slides={SLIDES} />);
    fireEvent.click(screen.getByLabelText('Second'));

    expect(currentTick().getAttribute('aria-label')).toBe('Second');
  });

  it('leaves typing alone', () => {
    render(
      <div>
        <StoryDeck slides={SLIDES} />
        <input aria-label="somewhere to type" />
      </div>
    );

    fireEvent.keyDown(screen.getByLabelText('somewhere to type'), { key: 'ArrowDown' });
    expect(currentTick().getAttribute('aria-label')).toBe('First');
  });

  /**
   * The deck opens settled, because the first slide is not transitioned into. It
   * was briefly the other way round, and the effect was a story that never
   * started: nothing was ever active, so nothing ever played.
   */
  it('makes the opening slide live immediately', () => {
    render(<StoryDeck slides={SLIDES} initialIndex={1} />);

    expect(screen.getByText('playing')).toBeTruthy();
  });

  /**
   * A scene is only live once its slide has arrived, so it plays from the top
   * rather than part-way through the transition that brought it in.
   */
  it('holds a scene inactive while a slide is on its way in', () => {
    render(<StoryDeck slides={SLIDES} />);
    fireEvent.keyDown(window, { key: 'ArrowDown' });

    expect(screen.getByText('idle')).toBeTruthy();
  });
});

/**
 * The deck's own shape, which lives in the story file because that is where the
 * finished thing is currently assembled.
 */
describe('the story as slides', () => {
  const slides = STORY_SLIDES;
  const kinds = slides.map(slide => slide.kind);

  /**
   * The pair the whole of Scene 2's ending was built for. Scene 2 finishes on the
   * exact frame Scene 3 opens on — asserted attribute-for-attribute in
   * `lookupScene.test.jsx` — and a narration slide dropped between them would
   * spend that continuity without anything failing to say so.
   */
  it('runs the lookup straight into the removal', () => {
    const lookup = slides.findIndex(slide => slide.key === 'key-routes');

    expect(lookup).toBeGreaterThan(-1);
    expect(slides[lookup + 1].key).toBe('server-leaves');
  });

  /**
   * Interstitials are for chapter breaks, not a rhythm to be kept up: they sit
   * where the thread is already broken, and nowhere else.
   */
  it('opens on narration and never runs two of them together', () => {
    expect(kinds[0]).toBe('interstitial');
    kinds.forEach((kind, index) => {
      if (index > 0 && kind === 'interstitial') expect(kinds[index - 1]).toBe('scene');
    });
  });

  /**
   * The opening slide names the subject; the rest are chapter headings. Only the
   * first is set as a lead, and a second one would make the story look like it
   * started twice.
   */
  it('leads with exactly one slide', () => {
    const leads = slides.filter(slide => slide.lead);

    expect(leads.length).toBe(1);
    expect(slides[0]).toBe(leads[0]);
    expect(slides[0].title).toMatch(/consistent hash ring/i);
  });
});

/**
 * The address bar is the only part of the deck a viewer can arrive through, so it
 * is worth driving rather than trusting: a link into the middle of the story has
 * to open there, and moving has to leave an address worth copying.
 */
describe('slide addresses', () => {
  const at = hash => {
    window.history.replaceState(null, '', hash || '#/');
  };

  beforeEach(() => at('#/'));
  afterEach(() => at('#/'));

  const deck = () => <StoryDeck slides={SLIDES} initialIndex={openingIndex(SLIDES)} urlSync />;

  it('opens where a link points', () => {
    at('#/two');
    render(deck());

    expect(currentTick().getAttribute('aria-label')).toContain('Second');
  });

  it('ignores an address that names nothing, rather than failing', () => {
    at('#/no-such-slide');
    render(deck());

    expect(currentTick().getAttribute('aria-label')).toContain('First');
  });

  it('writes the address as the viewer moves', () => {
    render(deck());
    expect(window.location.hash).toBe('#/one');

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(window.location.hash).toBe('#/scene');
    expect(document.title).toContain('Scene');
  });

  /**
   * Deliberate moves push and automatic ones replace, so the back button is a way
   * out of a story that plays itself rather than a way to walk backwards through
   * it one slide at a time.
   */
  it('goes back to where the viewer was, not to where it drifted', () => {
    render(deck());
    const before = window.history.length;

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(window.history.length).toBe(before + 1);

    // The deck advancing on its own leaves the address correct and the history
    // untouched.
    act(() => {
      window.history.replaceState(null, '', '#/two');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(currentTick().getAttribute('aria-label')).toContain('Second');
  });

  it('leaves the address alone unless asked to own it', () => {
    at('#/');
    render(<StoryDeck slides={SLIDES} />);
    fireEvent.keyDown(window, { key: 'ArrowDown' });

    expect(window.location.hash).toBe('#/');
  });
});
