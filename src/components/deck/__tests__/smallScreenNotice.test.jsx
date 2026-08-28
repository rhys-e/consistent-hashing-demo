import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

import StoryDeck from '../StoryDeck';
import { fitsStage, MIN_HEIGHT, MIN_WIDTH } from '../SmallScreenNotice';

const SLIDES = [
  { kind: 'interstitial', key: 'one', number: 'Part one', label: 'A', title: 'First', body: [] },
  { kind: 'interstitial', key: 'two', number: 'Part two', label: 'B', title: 'Second', body: [] },
];

const resize = (width, height) => {
  window.innerWidth = width;
  window.innerHeight = height;
  act(() => {
    fireEvent(window, new Event('resize'));
  });
};

/**
 * The stage is a fixed size that scales to fit, so a screen without the room does
 * not crop the story, it shrinks it. These are the sizes it was measured at.
 */
describe('deciding a screen is too small', () => {
  it.each([
    ['a phone held upright', 390, 844],
    ['a phone turned sideways', 844, 390],
    ['a tablet held upright', 768, 1024],
  ])('turns down %s', (name, width, height) => {
    expect(fitsStage(width, height)).toBe(false);
  });

  it.each([
    ['a small laptop', 1280, 800],
    ['a tablet turned sideways', 1024, 768],
  ])('accepts %s', (name, width, height) => {
    expect(fitsStage(width, height)).toBe(true);
  });

  /**
   * Both dimensions, because the stage scales to `meet` and the smaller one wins.
   * Width alone would wave a sideways phone through on the strength of a number
   * that is not the one doing the damage.
   */
  it('needs both dimensions, not the wider of them', () => {
    expect(fitsStage(MIN_WIDTH, MIN_HEIGHT - 1)).toBe(false);
    expect(fitsStage(MIN_WIDTH - 1, MIN_HEIGHT)).toBe(false);
    expect(fitsStage(MIN_WIDTH, MIN_HEIGHT)).toBe(true);
  });
});

describe('the small screen notice', () => {
  const opened = () => screen.queryByRole('dialog');
  const original = { width: window.innerWidth, height: window.innerHeight };

  afterEach(() => resize(original.width, original.height));

  it('stays out of the way on a screen with the room', () => {
    render(<StoryDeck slides={SLIDES} />);
    expect(opened()).toBeNull();
  });

  it('speaks up on a phone, and takes no for an answer', () => {
    window.innerWidth = 390;
    window.innerHeight = 844;
    render(<StoryDeck slides={SLIDES} />);

    expect(opened()).not.toBeNull();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /show it anyway/i }));
    });
    expect(opened()).toBeNull();
  });

  /** A nudge, not a wall: what it was covering is still there underneath. */
  it('leaves the story running behind it', () => {
    window.innerWidth = 390;
    window.innerHeight = 844;
    render(<StoryDeck slides={SLIDES} />);

    expect(screen.getByLabelText('Story slides')).toBeTruthy();
  });

  /** Turning a tablet answers for itself, without a reload. */
  it('goes when the screen turns out to have the room after all', () => {
    window.innerWidth = 390;
    window.innerHeight = 844;
    render(<StoryDeck slides={SLIDES} />);
    expect(opened()).not.toBeNull();

    resize(1280, 800);
    expect(opened()).toBeNull();
  });
});
