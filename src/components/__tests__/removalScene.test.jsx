import React from 'react';
import { render } from '@testing-library/react';

import ServerLeavesScene from '../ServerLeavesScene';
import { REMOVAL_BEATS, REMOVAL_MODEL } from '../RemovalRing';
import { DEPARTING_SERVER_ID } from '../../story/topology';

const frameAt = beat => {
  const { container } = render(<ServerLeavesScene pinnedProgress={beat} />);
  return {
    keyColour: name =>
      container.querySelector(`[data-layer="key:${name}"] polygon`)?.getAttribute('fill'),
    layerOpacity: layer =>
      Number(container.querySelector(`[data-layer="${layer}"]`)?.style.opacity),
  };
};

const colourOf = id => REMOVAL_MODEL.servers.find(server => server.id === id).color;
const departingKeys = REMOVAL_MODEL.keys.filter(key => key.owner === DEPARTING_SERVER_ID);
const stayingKeys = REMOVAL_MODEL.keys.filter(key => key.owner !== DEPARTING_SERVER_ID);

describe('the server leaving', () => {
  it('colours every key by its owner once the ring is claimed', () => {
    const frame = frameAt(REMOVAL_BEATS.settled);

    REMOVAL_MODEL.keys.forEach(key => {
      expect(frame.keyColour(key.name)).toBe(colourOf(key.owner));
    });
  });

  /**
   * The frame the scene exists for. A range whose server has gone has *no* owner,
   * and saying so is the setup for the sweep that answers it — a key that quietly
   * changed colour at the moment of failure would be asserting the answer before
   * showing the mechanism that produces it.
   */
  it('leaves the departing keys owned by nobody', () => {
    const frame = frameAt(REMOVAL_BEATS.orphaned.from + 0.65);

    departingKeys.forEach(key => {
      expect(frame.keyColour(key.name)).not.toBe(colourOf(key.owner));
      expect(frame.keyColour(key.name)).not.toBe(colourOf(key.nextOwner));
    });
    expect(frame.layerOpacity(`arc:${DEPARTING_SERVER_ID}`)).toBe(0);
    expect(frame.layerOpacity(`marker:${DEPARTING_SERVER_ID}`)).toBe(0);
  });

  /**
   * The payoff, and the reason the scene is in the story: everything that was not
   * the departing server's is untouched, at every moment rather than just at the
   * end.
   */
  it('never changes the colour of a key it did not own', () => {
    const beats = [REMOVAL_BEATS.settled, REMOVAL_BEATS.absorbed, REMOVAL_BEATS.end];

    beats.forEach(beat => {
      const frame = frameAt(beat);
      stayingKeys.forEach(key => {
        expect(frame.keyColour(key.name)).toBe(colourOf(key.owner));
      });
    });
  });

  it('hands every departing key to the same neighbour', () => {
    const frame = frameAt(REMOVAL_BEATS.end);

    departingKeys.forEach(key => {
      expect(frame.keyColour(key.name)).toBe(colourOf(key.nextOwner));
    });
  });

  /**
   * The recolour is the sweep read at the key's own position, not a second event
   * timed to look simultaneous with it. So a key must flip in the order the arc
   * reaches it, and part-way through exactly the reached ones have flipped.
   */
  it('flips each key as the arc reaches it, in order', () => {
    const { from, to } = REMOVAL_BEATS.absorb;
    const flippedAt = beat => {
      const frame = frameAt(beat);
      return departingKeys.filter(key => frame.keyColour(key.name) === colourOf(key.nextOwner))
        .length;
    };

    // Sampled finely, because the three keys flip within about a fifth of the
    // window and a coarse sample steps straight over all of it.
    const counts = Array.from({ length: 21 }, (unused, index) =>
      flippedAt(from + ((to - from) * index) / 20)
    );

    expect(counts[0]).toBe(0);
    expect(counts.at(-1)).toBe(departingKeys.length);
    counts.forEach((count, index) => {
      if (index > 0) expect(count).toBeGreaterThanOrEqual(counts[index - 1]);
    });
    // Not all at once at the end: the sweep has to be visibly doing the work.
    expect(
      counts.filter(count => count > 0 && count < departingKeys.length).length
    ).toBeGreaterThan(0);
  });
});
