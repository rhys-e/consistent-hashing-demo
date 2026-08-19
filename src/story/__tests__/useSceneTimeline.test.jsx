import React from 'react';
import { act, render } from '@testing-library/react';

import { useSceneTimeline } from '../useSceneTimeline';

/**
 * A scene is not playing at either end of a slide transition, and while that
 * transition was a quarter of a second the two ends were indistinguishable. Slowed
 * to a second they are opposites: arriving, the beat belongs at zero; leaving, it
 * belongs exactly where the viewer left it, because the scene is still on screen
 * sliding away and rewinding it there plays its opening frame as a parting shot.
 */
function Probe({ onBeat, ...options }) {
  const timeline = useSceneTimeline({ beatCount: 10, ...options });
  onBeat(timeline.progress);
  return null;
}

const mount = props => {
  let progress = null;
  const { rerender } = render(<Probe {...props} onBeat={value => (progress = value)} />);

  return {
    beat: () => progress.get(),
    // Setting the beat runs the hook's own listeners, which update state.
    set: value => act(() => progress.set(value)),
    to: next =>
      act(() => {
        rerender(<Probe {...props} {...next} onBeat={value => (progress = value)} />);
      }),
  };
};

describe('a scene arriving against a scene leaving', () => {
  it('holds the beat where the viewer left it while the scene is carried off', () => {
    const scene = mount({ autoPlay: true, current: true });
    scene.set(6.5);

    // Leaving: no longer playing, and no longer the current slide.
    scene.to({ autoPlay: false, current: false });
    expect(scene.beat()).toBe(6.5);
  });

  it('rewinds on the way back in, which is the same moment and a quieter one', () => {
    const scene = mount({ autoPlay: true, current: true });
    scene.set(6.5);
    scene.to({ autoPlay: false, current: false });

    // Arriving: the deck is travelling to it, and it has not landed yet.
    scene.to({ autoPlay: false, current: true, arriving: true });
    expect(scene.beat()).toBe(0);
  });

  /**
   * `arriving` defaults to `autoPlay`, so a scene rendered on its own is never
   * arriving and behaves exactly as it did before any of this.
   */
  it('leaves a scene rendered on its own alone', () => {
    const scene = mount({ autoPlay: true });
    scene.set(4);

    scene.to({ autoPlay: false });
    expect(scene.beat()).toBe(4);
  });

  /** Pinning still wins over everything, which is how Storybook reviews a frame. */
  it('lets a pinned beat override both', () => {
    const scene = mount({ autoPlay: false, pinnedProgress: 3.25, arriving: true });
    expect(scene.beat()).toBe(3.25);
  });
});
