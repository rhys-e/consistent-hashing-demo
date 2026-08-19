import React from 'react';
import { render } from '@testing-library/react';

import KeyRoutesScene from '../KeyRoutesScene';
import ServerLeavesScene from '../ServerLeavesScene';
import VirtualNodesScene from '../VirtualNodesScene';
import { LOOKUP_BEATS } from '../../ring/LookupRing';
import { REMOVAL_BEATS } from '../../ring/RemovalRing';
import { SPREAD_BEATS } from '../../ring/SpreadRing';

const alphasOf = (element, prefix) => {
  const { container } = render(element);

  return [...container.querySelectorAll(`[data-layer^="${prefix}"] circle`)].map(circle =>
    Number(circle.getAttribute('stroke-opacity'))
  );
};

describe('arc shading', () => {
  /**
   * One treatment, everywhere. An arc used to be nested bands sharing a bright head
   * and fading away behind it, which is beautiful on three arcs and unreadable on
   * thirty — a fade needs room to be a gradient, and in fifty pixels it is an edge.
   *
   * Two escapes were tried before flatness won. Switching the fade off partway
   * through Scene 4 gave the story two treatments with no event to explain the
   * change. Scaling the fall to the room available kept one rule but put arcs at
   * every alpha between a quarter and solid on one ring.
   *
   * The failure this guards against is either of those creeping back: one band per
   * arc, at full strength, in every scene that draws one.
   */
  it('draws every arc flat, in every scene', () => {
    [
      [<KeyRoutesScene pinnedProgress={LOOKUP_BEATS.settled} />, 'arc:'],
      [<ServerLeavesScene pinnedProgress={REMOVAL_BEATS.settled} />, 'arc:'],
      [<VirtualNodesScene pinnedProgress={SPREAD_BEATS.settled} />, 'arc:'],
    ].forEach(([element, prefix]) => {
      const alphas = alphasOf(element, prefix);

      expect(alphas.length).toBeGreaterThan(0);
      alphas.forEach(alpha => expect(alpha).toBe(1));
    });
  });

  /**
   * What the fade used to say is said by movement instead, and always was: an arc
   * sweeps *backwards* from its own server to the position before it, so a range
   * ending at its server is performed rather than shaded. Halfway through the
   * sweep an arc is part-drawn, which is the frame that carries the rule.
   */
  it('still states which way a range runs, by sweeping it', () => {
    const spanAt = at => {
      const { container } = render(<KeyRoutesScene pinnedProgress={at} />);
      const dash = container
        .querySelector('[data-layer="arc:cache-3"] circle')
        .getAttribute('stroke-dasharray');
      return Number(dash.split(' ')[0]);
    };

    const midSweep = (LOOKUP_BEATS.sweep.from + LOOKUP_BEATS.sweep.to) / 2;
    expect(spanAt(midSweep)).toBeGreaterThan(0);
    expect(spanAt(midSweep)).toBeLessThan(spanAt(LOOKUP_BEATS.settled));
  });

  /**
   * One dot, at one size, in every scene that draws one.
   *
   * It was shrunk to a third where the positions were dense, to buy room a hashed
   * ring does not have to give. A shrunken dot with the ring around it scaled down
   * reads as a smudge, and one with the ring held at weight reads as a target —
   * both of which cost the picture the single mark the story had taught. Placing
   * the positions buys the room instead, so the dot can stay as it was.
   */
  it('draws the same dot at one position each and at six', () => {
    const dotAt = (element, layer) => {
      const { container } = render(element);
      const dot = container.querySelector(`[data-layer="${layer}"] circle`);
      return {
        radius: Number(dot.getAttribute('r')),
        outline: Number(dot.getAttribute('stroke-width')),
      };
    };

    const sparse = dotAt(
      <ServerLeavesScene pinnedProgress={REMOVAL_BEATS.settled} />,
      'marker:cache-3'
    );
    const dense = dotAt(
      <VirtualNodesScene pinnedProgress={SPREAD_BEATS.settled} />,
      'marker:cache-3#0'
    );

    expect(dense).toEqual(sparse);
  });

  /**
   * The picture the placement exists to produce: thirty full-size dots, none of
   * them touching.
   *
   * A hash puts twelve of thirty neighbouring pairs closer together than a dot is
   * wide, two of them a pixel apart, and 52,800 candidate casts and key formats
   * produced nothing below seven collisions — for that many random points a tight
   * pair is the expected outcome, not bad luck. So Scene 4's positions are placed,
   * and placing them also freed the count, which is now six rather than ten.
   */
  it('clears every dot of its neighbour at six positions each', () => {
    const spacingOf = (element, prefix) => {
      const { container } = render(element);
      const marks = [...container.querySelectorAll(`[data-layer^="${prefix}"] circle`)]
        .map(dot => ({
          x: Number(dot.getAttribute('cx')),
          y: Number(dot.getAttribute('cy')),
          r: Number(dot.getAttribute('r')),
        }))
        .filter(dot => dot.r > 0.4);

      const nearest = marks.map(one =>
        Math.min(
          ...marks
            .filter(other => other !== one)
            .map(other => Math.hypot(other.x - one.x, other.y - one.y))
        )
      );

      return {
        count: marks.length,
        radius: marks[0].r,
        tightest: Math.min(...nearest),
        widest: Math.max(...nearest),
      };
    };

    const sparse = spacingOf(
      <ServerLeavesScene pinnedProgress={REMOVAL_BEATS.settled} />,
      'marker:'
    );
    const dense = spacingOf(<VirtualNodesScene pinnedProgress={SPREAD_BEATS.settled} />, 'marker:');

    expect(sparse.count).toBe(3);
    expect(dense.count).toBe(18);
    // The same dot at both densities, and at ten each no two of them touch.
    expect(dense.radius).toBe(sparse.radius);
    expect(dense.tightest).toBeGreaterThan(2 * dense.radius);
  });

  /**
   * And the other half of the bargain: placed, but not *arranged*.
   *
   * Perfectly even spacing would be a worse lie than the clumping it replaces,
   * because evenness is the thing consistent hashing has to work for — a ring that
   * arrives evenly divided has palmed the card. The gaps have to keep enough
   * variation to read as scattered.
   */
  it('keeps the spacing irregular enough not to read as arranged', () => {
    const { container } = render(<VirtualNodesScene pinnedProgress={SPREAD_BEATS.settled} />);
    const points = [...container.querySelectorAll('[data-layer^="marker:"] circle')].map(dot => ({
      x: Number(dot.getAttribute('cx')),
      y: Number(dot.getAttribute('cy')),
    }));

    const angles = points
      .map(point => Math.atan2(point.y - 310, point.x - 392))
      .sort((left, right) => left - right);
    const gaps = angles.map((angle, index) =>
      index === 0 ? angle + 2 * Math.PI - angles[angles.length - 1] : angle - angles[index - 1]
    );

    // Nowhere near a metronome: the widest gap is at least half again the tightest.
    expect(Math.max(...gaps) / Math.min(...gaps)).toBeGreaterThan(1.5);
  });

  /**
   * What the ring is drawn in the order of.
   *
   * The band, then what happened to the band, then the positions that divide it.
   * The highlight used to come last of all, which put a highlighted stretch in
   * front of the dots at either end of it — and a dot *is* the boundary of that
   * stretch, so the highlight covered exactly the thing it was pointing at.
   *
   * Painter's order in SVG is document order, so this is a property of where the
   * blocks sit in the file and nothing else guards it.
   */
  it('draws the highlight over the band and under the marks', () => {
    const orderOf = element => {
      const { container } = render(element);
      const kinds = [...container.querySelectorAll('[data-layer]')]
        .map(node => node.dataset.layer.split(':')[0])
        .filter(kind => ['arc', 'moved', 'marker', 'key'].includes(kind));

      // First appearance of each kind, in the order they are painted.
      return kinds.filter((kind, index) => kinds.indexOf(kind) === index);
    };

    expect(orderOf(<ServerLeavesScene pinnedProgress={REMOVAL_BEATS.closing.from + 1} />)).toEqual([
      'arc',
      'moved',
      'marker',
      'key',
    ]);
    expect(orderOf(<VirtualNodesScene pinnedProgress={SPREAD_BEATS.closing.from + 1} />)).toEqual([
      'arc',
      'moved',
      'marker',
      'key',
    ]);
  });
});
