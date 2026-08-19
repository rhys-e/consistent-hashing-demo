import React from 'react';
import { render, screen } from '@testing-library/react';

import HashSpaceScene, { SCENE_STEPS } from '../HashSpaceScene';
import { STAGE } from '../../../story/stage';

const lastStep = SCENE_STEPS[SCENE_STEPS.length - 1].at;

describe('hash space scene', () => {
  /**
   * Labels are pushed away from the rail along its normal, so the widest point of
   * the composition is somewhere mid-bend rather than at either end of it. This
   * was worth keeping from the two scenes this one replaced.
   */
  it.each([0.5, 2, 4, 6.5, 7.5, 8.5, lastStep])(
    'keeps labels inside the stage at beat %s',
    beat => {
      const { container } = render(<HashSpaceScene pinnedProgress={beat} />);

      container.querySelectorAll('text[data-layer]').forEach(element => {
        const halfWidth = (element.textContent.length * 11) / 2;
        const x = Number(element.getAttribute('x'));
        const y = Number(element.getAttribute('y'));

        expect({ layer: element.dataset.layer, beat, inside: true }).toEqual({
          layer: element.dataset.layer,
          beat,
          inside: x - halfWidth > 0 && x + halfWidth < STAGE.width && y > 0 && y < STAGE.height,
        });
      });
    }
  );

  /**
   * The line and the ring are one scene now, so the frame that used to need
   * asserting — one scene's last equalling the next one's first — is structural.
   * What is still worth checking is that the bend actually happens.
   */
  it('is a straight rail before the bend and a closed ring after it', () => {
    const railAt = beat => {
      const { container } = render(<HashSpaceScene pinnedProgress={beat} />);
      return container.querySelector('[data-layer="rail-core"]').getAttribute('d');
    };

    // A straight rail is two segments of a polyline; a closed ring is hundreds.
    expect(railAt(3).split('L').length).toBeLessThan(5);
    expect(railAt(lastStep).split('L').length).toBeGreaterThan(100);
  });

  /**
   * Nothing but the story until the story has finished, or until the viewer takes
   * over. The transport is the interface for studying a scene, and studying is not
   * what someone is doing the first time it plays.
   */
  it('withholds the transport until the scene ends or the viewer engages', () => {
    const { rerender } = render(<HashSpaceScene />);
    expect(screen.queryByText('Replay')).toBeNull();

    rerender(<HashSpaceScene engaged />);
    expect(screen.queryByText('Replay')).toBeTruthy();
  });
});
