import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import StoryDeck from '../StoryDeck';

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
   * Two advances, not one. The dwell timer is only scheduled once the slide has
   * reported itself readable, so a single long advance runs the read timer and
   * then stops — the dwell is scheduled as that state settles, with no time left
   * to run it.
   */
  const runUntilCountdown = () => {
    runTimers(4000);
    runTimers(3000);
  };

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('appears once the slide has been readable and its dwell has passed', () => {
    render(<StoryDeck slides={NARRATION} />);

    expect(screen.queryByTestId('deck-countdown')).toBeNull();

    runTimers(4000); // the slide finishes reading
    expect(screen.queryByTestId('deck-countdown')).toBeNull();

    runTimers(3000); // and then is left alone for a moment
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
