import React from 'react';
import { render } from '@testing-library/react';

import HashSpaceScene, { HASH_SPACE_BEATS } from '../HashSpaceScene';

/** The extent of a path, read off its own coordinates. */
const boxOf = d => {
  const points = [...d.matchAll(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)].map(match => [
    Number(match[1]),
    Number(match[2]),
  ]);
  const ys = points.map(point => point[1]);

  return { height: Math.max(...ys) - Math.min(...ys) };
};

const railAt = beat => {
  const { container } = render(<HashSpaceScene pinnedProgress={beat} />);

  return {
    core: container.querySelector('[data-layer="rail-core"]'),
    gradient: container.querySelector('linearGradient[id$="-rail"]'),
  };
};

describe('the rail gradient', () => {
  /**
   * The rail is a *perfectly horizontal line* for the whole of the number-line
   * scene — `M 90 310 L 550 310 L 1010 310`, a box 920 wide and zero high. This is
   * not incidental: a straight rail is the point of the first two thirds of the
   * scene, so its path has exactly one y value in it and its bounding box has no
   * height at all.
   */
  it('draws the rail with a bounding box of no height while it is straight', () => {
    expect(boxOf(railAt(4).core.getAttribute('d')).height).toBe(0);
    expect(boxOf(railAt(HASH_SPACE_BEATS.morph.from).core.getAttribute('d')).height).toBe(0);

    // And with height the moment it bends, which is where the trap sprang.
    expect(
      boxOf(railAt(HASH_SPACE_BEATS.morph.from + 0.1).core.getAttribute('d')).height
    ).toBeGreaterThan(0);
  });

  /**
   * Which is why the gradient painting it has to be measured in *stage*
   * coordinates rather than against that box.
   *
   * SVG says an element whose bounding box is degenerate — zero width or zero
   * height — is not rendered when it references an `objectBoundingBox` gradient.
   * The rail's core stroke was therefore not drawn at all for the whole straight
   * scene, and appeared at full strength in the single frame the bend gave its box
   * some height. Everything visible before that was the glow and the scaffold
   * around a line that was not there.
   *
   * In user space the gradient does not care what shape references it.
   */
  it('measures it in stage coordinates, not against that box', () => {
    const { gradient, core } = railAt(4);

    expect(gradient.getAttribute('gradientUnits')).toBe('userSpaceOnUse');

    // Spanning exactly the straight rail, so its ends land where the fade belongs.
    const [start, end] = [gradient.getAttribute('x1'), gradient.getAttribute('x2')].map(Number);
    const xs = [...core.getAttribute('d').matchAll(/(-?\d+(?:\.\d+)?)\s+-?\d/g)].map(match =>
      Number(match[1])
    );

    expect(start).toBe(Math.min(...xs));
    expect(end).toBe(Math.max(...xs));
  });
});
