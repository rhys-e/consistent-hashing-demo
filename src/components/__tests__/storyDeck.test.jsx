import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import StoryDeck, { openingIndex } from '../StoryDeck';
import { COUNTDOWN_SECONDS } from '../DeckCountdown';
import { STORY_SLIDES } from '../Story';
import NarrationSlide from '../NarrationSlide';

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

  /**
   * The ticks are a control, and while the deck is running itself there is nothing
   * to steer — so they wait with the scene transport and the scroll hint rather
   * than sitting on a composition whose whole point is that nothing else is on it.
   */
  it('keeps the ticks out of sight until the viewer takes over', () => {
    render(<StoryDeck slides={SLIDES} />);
    const ticks = () => screen.getByLabelText('Story slides');

    expect(ticks().dataset.shown).toBe('false');

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(ticks().dataset.shown).toBe('true');
  });

  /**
   * Hiding them hides the only pointer-free way to see where you are, so focus has
   * to bring them back. They stay in the document and stay focusable — only their
   * opacity goes — because a keyboard user landing on something invisible is worse
   * than the clutter this removes.
   */
  it('brings them back for a viewer who tabs to them', () => {
    render(<StoryDeck slides={SLIDES} />);
    const ticks = () => screen.getByLabelText('Story slides');

    expect(ticks().dataset.shown).toBe('false');
    // Still reachable while hidden, which is the whole point of hiding them this
    // way rather than unmounting them.
    expect(within(ticks()).getAllByRole('button').length).toBe(SLIDES.length);

    fireEvent.focus(within(ticks()).getAllByRole('button')[1], { bubbles: true });
    expect(ticks().dataset.shown).toBe('true');
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

  /** Lookup and removal stay adjacent, with one question slide between them. */
  it('puts exactly one question between the lookup and the removal', () => {
    const lookup = slides.findIndex(slide => slide.key === 'key-routes');
    const removal = slides.findIndex(slide => slide.key === 'server-leaves');

    expect(lookup).toBeGreaterThan(-1);
    expect(removal).toBe(lookup + 2);
    expect(slides[lookup + 1].kind).toBe('interstitial');
    // And it has to be the question, not any interstitial that happens to be there.
    expect(slides[lookup + 1].body.join(' ')).toMatch(/how many keys have to move/);
  });

  /**
   * Interstitials are for chapter breaks, not a rhythm to be kept up: they sit
   * where the thread is already broken, and nowhere else. The one exception is
   * the end, where a recap and the sandbox handoff are two jobs and have to sit
   * next to each other.
   */
  it('opens on narration and never runs two of them together', () => {
    expect(kinds[0]).toBe('interstitial');

    const pairs = [];
    kinds.forEach((kind, index) => {
      if (index > 0 && kind === 'interstitial' && kinds[index - 1] === 'interstitial') {
        pairs.push(index);
      }
    });

    expect(pairs).toEqual([slides.findIndex(slide => slide.key === 'yours')]);
  });

  it('recaps the claim before the sandbox handoff', () => {
    const recap = slides.findIndex(slide => slide.key === 'recap');
    const yours = slides.findIndex(slide => slide.key === 'yours');

    expect(recap).toBeGreaterThan(-1);
    expect(yours).toBe(recap + 1);
    expect(slides[recap].kind).toBe('interstitial');
    expect(slides[yours].kind).toBe('interstitial');
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

/**
 * A slide is inactive for the whole of the deck's transition, at either end of it,
 * and while that transition was a quarter of a second the two ends were
 * indistinguishable. Slowed to a second they are opposites: one is a slide with
 * nothing on it yet, the other a slide with everything on it still.
 *
 * Read through `NarrationSlide` directly rather than through the deck, because
 * jsdom has no layout and the deck never completes a transition there — so the
 * states this is about are exactly the ones the deck cannot be driven into.
 */
describe('a slide arriving against a slide leaving', () => {
  const TITLE = 'Servers come and go';
  const BODY = ['First paragraph.', 'Second paragraph.'];

  const titleOf = container => container.querySelector('.glitch-title').textContent;
  const shownOf = container => container.querySelectorAll('p')[0].dataset.shown;

  const headingOf = container => container.querySelector('.glitch-title');

  /**
   * Nothing on the way in. A slide arriving with a frozen row of block glyphs on
   * it looks broken rather than loading — noise only reads as something resolving
   * while it is actually moving — so the title waits, and then arrives out of
   * nothing and settles into itself.
   */
  it('carries no title in, and carries the finished one out', () => {
    const arriving = render(
      <NarrationSlide title={TITLE} body={BODY} active={false} current />
    ).container;
    expect(headingOf(arriving).dataset.shown).toBe('false');

    const leaving = render(
      <NarrationSlide title={TITLE} body={BODY} active={false} current={false} />
    ).container;
    expect(headingOf(leaving).dataset.shown).toBe('true');
    expect(titleOf(leaving)).toBe(TITLE);
  });

  /**
   * What the hidden title is holding underneath. The resolve is started by an
   * effect, so a title left resolved while inactive would paint one frame of the
   * finished text at the moment it becomes visible, before the effect scrambles it.
   */
  it('holds noise under the hidden title rather than the answer', () => {
    const arriving = render(
      <NarrationSlide title={TITLE} body={BODY} active={false} current />
    ).container;

    // Same length and the same spaces, so the box never moves as it resolves.
    expect(titleOf(arriving)).toHaveLength(TITLE.length);
    expect(titleOf(arriving)).not.toBe(TITLE);
  });

  it('holds the paragraphs on the way out and hides them on the way in', () => {
    const arriving = render(
      <NarrationSlide title={TITLE} body={BODY} active={false} current />
    ).container;
    expect(shownOf(arriving)).toBe('false');

    const leaving = render(
      <NarrationSlide title={TITLE} body={BODY} active={false} current={false} />
    ).container;
    expect(shownOf(leaving)).toBe('true');
  });

  /** Rendered on its own, with no deck to be current in, nothing has changed. */
  it('leaves a slide rendered on its own exactly as it was', () => {
    const alone = render(<NarrationSlide title={TITLE} body={BODY} active={false} />).container;

    expect(titleOf(alone)).toBe(TITLE);
    expect(shownOf(alone)).toBe('true');
  });
});

/**
 * The discoverability half of hiding the ticks.
 *
 * Hidden until engagement alone, the one control that says "you can go somewhere
 * else" could not be found without already knowing it was there. Reaching for a
 * control is how anyone looks for one, so the mouse moving brings them back for a
 * few seconds and then lets them go.
 *
 * Its own block because it needs the clock held, and the timers in `the countdown`
 * belong to that one.
 */
describe('reaching for the ticks', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const ticks = () => screen.getByLabelText('Story slides');
  const settle = ms =>
    act(() => {
      jest.advanceTimersByTime(ms);
    });

  /**
   * Hand-built, because jsdom has no `PointerEvent` and the `Event` it falls back
   * to drops `pointerType` from its init. Fired through `fireEvent` with the field
   * missing, every one of these tests would pass without the guard existing.
   */
  const move = pointerType =>
    act(() => {
      const event = new Event('pointermove', { bubbles: true });
      Object.defineProperty(event, 'pointerType', { value: pointerType });
      fireEvent(window, event);
    });

  /**
   * Not taking over. A mouse crossing the screen is not a decision, and the deck
   * goes on advancing — which is what separates this from every other way they
   * appear.
   */
  it('shows them while the mouse is moving, then lets them go', () => {
    render(<StoryDeck slides={SLIDES} />);
    expect(ticks().dataset.shown).toBe('false');

    move('mouse');
    expect(ticks().dataset.shown).toBe('true');

    settle(4000);
    expect(ticks().dataset.shown).toBe('false');
  });

  /** Each move buys the full window again, rather than the first one timing out. */
  it('keeps them up while the mouse keeps moving', () => {
    render(<StoryDeck slides={SLIDES} />);

    move('mouse');
    settle(2000);
    move('mouse');
    settle(2000);

    expect(ticks().dataset.shown).toBe('true');
  });

  /**
   * The pointer resting on them is the one moment they are certainly being used,
   * and it is the one moment the idle timer would otherwise take them away.
   */
  it('holds them up while the pointer rests on them', () => {
    render(<StoryDeck slides={SLIDES} />);
    move('mouse');

    act(() => {
      fireEvent.pointerEnter(ticks());
    });
    settle(4000);
    expect(ticks().dataset.shown).toBe('true');

    act(() => {
      fireEvent.pointerLeave(ticks());
    });
    settle(4000);
    expect(ticks().dataset.shown).toBe('false');
  });

  /** Faded out, they are not a strip down the side of the story that takes clicks. */
  it('does not take a click while it is not there', () => {
    render(<StoryDeck slides={SLIDES} />);
    expect(ticks().className).toContain('pointer-events-none');

    move('mouse');
    expect(ticks().className).toContain('pointer-events-auto');
  });

  /** A touch drag already steers the deck, so it does not also flicker them. */
  it('ignores a touch point, which has its own way of showing them', () => {
    render(<StoryDeck slides={SLIDES} />);

    move('touch');
    expect(ticks().dataset.shown).toBe('false');
  });
});
