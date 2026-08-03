import React from 'react';
import { render } from '@testing-library/react';

import VirtualNodesScene from '../VirtualNodesScene';
import ServerLeavesScene from '../ServerLeavesScene';
import { SPREAD_BEATS, SPREAD_MODEL } from '../SpreadRing';
import { REMOVAL_BEATS } from '../RemovalRing';
import { DEPARTING_SERVER_ID } from '../../../story/topology';

const frameAt = beat => {
  const { container } = render(<VirtualNodesScene pinnedProgress={beat} />);
  return container;
};

/**
 * Motion writes `opacity` as an *attribute* on an SVG element, not as a style, so
 * reading `style.opacity` gets the empty string — and `Number('')` is 0, which
 * makes every element look hidden and every assertion about visibility pass or
 * fail for the wrong reason.
 */
const opacityOf = node => {
  const attribute = node?.getAttribute('opacity');
  if (attribute !== null && attribute !== undefined) return Number(attribute);
  return node?.style.opacity ? Number(node.style.opacity) : 1;
};

/**
 * How many separate stretches of ring nobody owns.
 *
 * Every arc that is drawn is owned, so the gaps are what is left between them —
 * and counting them is the difference the scene exists to show.
 */
function unownedStretches(container) {
  const owned = [...container.querySelectorAll('[data-layer^="arc:"]')]
    .filter(layer => opacityOf(layer) > 0.01)
    .map(layer => layer.dataset.layer.slice(4));

  return SPREAD_MODEL.levels[1].before.arcs.filter(arc => !owned.includes(arc.vnodeId)).length;
}

describe('virtual nodes', () => {
  it('splits three positions into thirty', () => {
    const markers = frameAt(SPREAD_BEATS.settled).querySelectorAll('[data-layer^="marker:"]');

    expect(markers.length).toBe(30);
    expect([...markers].every(marker => opacityOf(marker) > 0.99)).toBe(true);
  });

  /**
   * The story stops following individual keys here. Thirty boundaries is past the
   * point where one can be tracked, and reading the ring as quantities is what the
   * full-scale scenes assume — so the keys leave during the split rather than
   * lingering as marks nobody is being asked to follow.
   */
  it('lets the keys go as the positions multiply', () => {
    const keysAt = beat =>
      [...frameAt(beat).querySelectorAll('[data-layer^="key:"]')].filter(
        key => opacityOf(key) > 0.01
      ).length;

    expect(keysAt(SPREAD_BEATS.split.from)).toBeGreaterThan(0);
    expect(keysAt(SPREAD_BEATS.settled)).toBe(0);
  });

  /**
   * The whole argument, as a picture: one server failing takes out one stretch of
   * ring when it holds one position, and many scattered stretches when it holds
   * ten. Asserted against Scene 3 rather than in isolation, because the claim is
   * a comparison and a number on its own would not be one.
   */
  it('leaves many small gaps where one position leaves one large one', () => {
    const sparse = render(
      <ServerLeavesScene pinnedProgress={REMOVAL_BEATS.orphaned.from + 0.65} />
    ).container;
    const sparseGaps = [...sparse.querySelectorAll('[data-layer^="arc:"]')].filter(
      layer => opacityOf(layer) <= 0.01
    ).length;

    expect(sparseGaps).toBe(1);
    expect(unownedStretches(frameAt(SPREAD_BEATS.orphaned.from + 1.2))).toBe(
      SPREAD_MODEL.levels[1].before.arcs.filter(arc => arc.serverId === DEPARTING_SERVER_ID).length
    );
    expect(unownedStretches(frameAt(SPREAD_BEATS.orphaned.from + 1.2))).toBe(10);
  });

  /** And the outcome: shared, rather than landing on one. */
  it('ends with both survivors near half rather than one at two thirds', () => {
    const [sparse, dense] = SPREAD_MODEL.levels;
    const share = (level, id) =>
      Number((level.after.shares.find(entry => entry.id === id).share * 100).toFixed(1));

    expect(share(sparse, 'cache-3')).toBe(64.3);
    expect(share(dense, 'cache-3')).toBe(51.5);
    expect(share(dense, 'cache-5')).toBe(48.5);
  });

  /**
   * The two scenes end on the same device so they can be held against each other,
   * and the contrast *is* the argument: one solid block in one colour against
   * seven scattered pieces in two. A panel reporting 64/36 and 52/48 states the
   * same thing and states it — this is the only part a viewer sees.
   */
  it('closes on what changed hands, in one colour or two', () => {
    const movedIn = container =>
      [...container.querySelectorAll('[data-layer^="moved:"]')].filter(
        layer => opacityOf(layer) > 0.5
      );
    const coloursOf = pieces => new Set(pieces.map(piece => piece.dataset.layer.split(':')[1]));

    const sparse = movedIn(
      render(<ServerLeavesScene pinnedProgress={REMOVAL_BEATS.closing.from + 1} />).container
    );
    const dense = movedIn(frameAt(SPREAD_BEATS.closing.from + 1));

    expect(coloursOf(sparse).size).toBe(1);
    expect(coloursOf(dense).size).toBe(2);
    expect(dense.length).toBeGreaterThan(sparse.length);
  });
});
