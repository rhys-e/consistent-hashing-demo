import React from 'react';
import { render } from '@testing-library/react';

import VirtualNodesScene from '../VirtualNodesScene';
import { SPREAD_BEATS } from '../../ring/SpreadRing';
import { DensityRampScene, rampFor } from '../DensityRampScene';

/**
 * Every mark on the ring, as the place it is and the size it is drawn at.
 *
 * Positions rather than DOM shape, because the two scenes are different components
 * that draw ownership by different means — one arc per position against one dashed
 * circle per server. What has to match is where the marks are, which is the whole
 * of the continuity claim.
 */
const marksOf = (element, selector) => {
  const { container } = render(element);
  const at = (x, y) => `${x.toFixed(2)},${y.toFixed(2)}`;

  return [...container.querySelectorAll(selector)]
    .flatMap(node => {
      // A dot that has not arrived is drawn at radius nought rather than not drawn.
      if (node.tagName === 'circle') {
        return Number(node.getAttribute('r')) > 0.4
          ? [at(Number(node.getAttribute('cx')), Number(node.getAttribute('cy')))]
          : [];
      }

      // A tick is the same position drawn the other way, so it is reported as its
      // midpoint — which is the point on the band the dot would have sat on.
      const shown = node.getAttribute('opacity');
      if (shown !== null && Number(shown) <= 0.02) return [];

      const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map(name =>
        Number(node.getAttribute(name))
      );
      return [at((x1 + x2) / 2, (y1 + y2) / 2)];
    })
    .sort();
};

describe('the density bridge scenes', () => {
  /**
   * The claim treatment D is built on, and the reason it is worth more than the
   * others: it opens on the frame Scene 4 already showed.
   *
   * Same cast and the same placement table, so the same eighteen marks in the same
   * eighteen places at the same size. It is exactly the kind of thing a later
   * retiming, a change of cast or a change of position count breaks silently, and
   * the bridge is pointless once it is not true.
   */
  it('opens the multiply bridge on the frame Scene 4 already showed', () => {
    const scene4 = marksOf(
      <VirtualNodesScene pinnedProgress={SPREAD_BEATS.settled} />,
      '[data-layer^="marker:"] circle, [data-layer^="marker:"] line'
    );
    const bridge = marksOf(
      <DensityRampScene treatment="multiply" pinnedProgress={0} />,
      '[data-layer^="position:"] circle, [data-layer^="position:"] line'
    );

    expect(scene4.length).toBe(18);
    expect(bridge).toEqual(scene4);
  });

  /**
   * The notation change, as the only thing happening when it happens. A dot and a
   * tick for the same position are on screen together only during the morph, and
   * the ring is doing nothing else while they trade places.
   */
  it('trades dots for ticks in a beat of its own', () => {
    const { beats } = rampFor('multiply');
    const countAt = at => {
      const { container } = render(<DensityRampScene treatment="multiply" pinnedProgress={at} />);
      const shown = nodes =>
        [...nodes].filter(node => {
          const own = node.getAttribute('opacity');
          return own === null || Number(own) > 0.02;
        }).length;

      return {
        dots: [...container.querySelectorAll('[data-layer^="position:"] circle')].filter(
          circle => Number(circle.getAttribute('r')) > 0.4
        ).length,
        ticks: shown(container.querySelectorAll('[data-layer^="position:"] line')),
      };
    };

    // Every dealt position as a dot, then both notations, then every one a tick.
    expect(countAt(beats.steps[0].settled)).toEqual({ dots: 90, ticks: 0 });

    const midMorph = countAt((beats.morph.from + beats.morph.to) / 2);
    expect(midMorph.dots).toBe(90);
    expect(midMorph.ticks).toBe(90);

    expect(countAt(beats.morph.to + 0.25)).toEqual({ dots: 0, ticks: 90 });
  });

  /**
   * The mark layer arrives and then retires, rather than doing both inside one
   * movement. Driven off the position count it did both at once, and three hundred
   * and sixty ticks washed in and vanished again without ever being a frame.
   */
  it('lands the last tranche before dissolving the marks into the ring', () => {
    const { beats } = rampFor('multiply');
    const ticksAt = at => {
      const { container } = render(<DensityRampScene treatment="multiply" pinnedProgress={at} />);
      return [...container.querySelectorAll('path[stroke-width]')].filter(path => {
        const own = path.getAttribute('opacity');
        return (
          (path.getAttribute('d') ?? '').startsWith('M') && (own === null || Number(own) > 0.4)
        );
      }).length;
    };

    const last = beats.steps[1];
    // One bulk path per server, fully present once the tranche has washed in.
    expect(ticksAt(last.arrive.to)).toBe(3);
    // And gone by the time the ring has finished resolving onto them.
    expect(ticksAt(last.settled)).toBe(0);
  });

  /** Every treatment ends on a bare ring: no marks, which is Scene 5's notation. */
  it('hands over to the following scene with the marks retired', () => {
    ['fill-in', 'carry-over', 'through-window', 'multiply'].forEach(treatment => {
      const { beats } = rampFor(treatment);
      const { container } = render(
        <DensityRampScene treatment={treatment} pinnedProgress={beats.closing} />
      );

      const marks = [
        // Bulk tick paths, and the ticks and dots of the dealt layer.
        ...container.querySelectorAll('path[stroke-width]'),
        ...container.querySelectorAll('[data-layer^="position:"] line'),
        ...container.querySelectorAll('[data-layer^="position:"] circle'),
      ]
        // Not the window's caliper hairlines: those are the strip saying which
        // section it is, not a mark on the ring.
        .filter(node => !node.closest('[data-layer="window-edges"]'))
        .filter(node => Number(node.getAttribute('r') ?? 1) > 0.4)
        .filter(node => Number(node.getAttribute('opacity') ?? 1) > 0.02);

      expect(marks).toEqual([]);
    });
  });
});
