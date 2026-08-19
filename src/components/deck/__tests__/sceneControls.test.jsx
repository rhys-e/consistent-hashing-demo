import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

import SceneControls from '../SceneControls';
import { useSceneTimeline } from '../../../story/useSceneTimeline';

/**
 * The transport is one button, so there is exactly one thing it has to do.
 *
 * It called `reset`, which stops playback and puts the beat back to zero — and
 * nothing starts it again. The scene rewound and sat on its first frame, which
 * looks so much like the beginning of a replay that it took a while to notice it
 * was the whole of one.
 */
function Harness({ onTimeline }) {
  const timeline = useSceneTimeline({ beatCount: 10, steps: [], autoPlay: false });
  onTimeline(timeline);

  return <SceneControls timeline={timeline} />;
}

const mount = () => {
  let timeline = null;
  render(<Harness onTimeline={value => (timeline = value)} />);

  return {
    beat: () => timeline.progress.get(),
    status: () => timeline.status,
    seek: value => act(() => timeline.seek(value)),
  };
};

describe('the scene transport', () => {
  it('plays the scene again rather than only rewinding it', () => {
    const scene = mount();
    scene.seek(6);
    expect(scene.beat()).toBe(6);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /replay/i }));
    });

    expect(scene.beat()).toBe(0);
    // And running, which is the half that was missing.
    expect(scene.status()).toBe('playing');
  });

  it('does the same on the space bar', () => {
    const scene = mount();
    scene.seek(4);

    act(() => {
      fireEvent.keyDown(window, { key: ' ' });
    });

    expect(scene.beat()).toBe(0);
    expect(scene.status()).toBe('playing');
  });
});
