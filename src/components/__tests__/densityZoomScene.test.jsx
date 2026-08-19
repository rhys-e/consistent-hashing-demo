import React from 'react';
import { render } from '@testing-library/react';

import ZoomDensityScene from '../ZoomDensityScene';
import { CLOSING_KEYS, STRIP, ZOOM_BEATS, ZOOM_MODEL } from '../DensityZoom';
import { resolveOwner } from '../../story/ringModel';

const groupFor = (beat, name) => {
  const { container } = render(<ZoomDensityScene pinnedProgress={beat} />);
  return container.querySelector(`[data-layer="closing-key:${name}"]`);
};

const markX = group => {
  const points = group.querySelector('polygon').getAttribute('points');
  // The diamond's corners are top, right, bottom, left, so the first is centred.
  return Number(points.split(' ')[0].split(',')[0]);
};

/**
 * The scene closes by restating the rule the whole story is built on — a key
 * belongs to the first server position clockwise from it — at a density where a
 * viewer can no longer check it by eye. Which makes the check a test's job.
 *
 * Where the keys sit is a composition decision and is not tested. Who owns them
 * is not, and is.
 */
describe('the closing keys of the density scene', () => {
  it('lands three keys, on three different servers', () => {
    expect(CLOSING_KEYS).toHaveLength(3);
    expect(new Set(CLOSING_KEYS.map(key => key.owner)).size).toBe(3);
  });

  it('walks each key to the position that actually owns it', () => {
    CLOSING_KEYS.forEach(key => {
      const owner = resolveOwner(ZOOM_MODEL.topology, key.position);

      expect(owner.serverId).toBe(key.owner);
      // The walk ends on the owning position itself, not merely somewhere inside
      // the range. Forwards, because that direction is the whole rule.
      expect(key.arrival).toBeCloseTo(owner.position, 9);
      expect(key.arrival).toBeGreaterThan(key.position);
    });
  });

  /**
   * Placed inside the window the sweep stops on. If the two ever came apart a key
   * would be drawn outside the strip, or worse, inside it at a position it does
   * not have.
   */
  it('lands every key inside the strip, with room to walk', () => {
    CLOSING_KEYS.forEach(key => {
      const landed = markX(groupFor(ZOOM_BEATS.land.to, key.name));
      const arrived = markX(groupFor(ZOOM_BEATS.route.to, key.name));

      expect(landed).toBeGreaterThan(STRIP.x);
      expect(landed).toBeLessThan(STRIP.x + STRIP.width);
      // The key does not move. Scene 2 established that a lookup travels and the
      // key it started from stays where it is.
      expect(arrived).toBeCloseTo(landed, 6);
    });
  });

  /** Far enough apart that no two marks, and no two labels, collide. */
  it('spaces the keys and their walks along the strip', () => {
    const at = key => markX(groupFor(ZOOM_BEATS.land.to, key.name));

    CLOSING_KEYS.slice(1).forEach((key, index) => {
      const previous = CLOSING_KEYS[index];
      // Wider than a label, which is the thing that collides first.
      expect(at(key) - at(previous)).toBeGreaterThan(60);
      // And the walk ahead of it stops well short of the next key.
      const walkEnd = at(previous) + ((previous.arrival - previous.position) / 0.02) * STRIP.width;
      expect(at(key) - walkEnd).toBeGreaterThan(12);
    });
  });

  /**
   * Uncoloured until the lookup answers, which is the same rule Scene 2 is tested
   * against. Colouring on arrival is the scene showing its working.
   */
  it('takes each owner colour only once that walk has arrived', () => {
    CLOSING_KEYS.forEach(key => {
      const colourAt = beat =>
        groupFor(beat, key.name).querySelector('polygon').getAttribute('fill');
      const owner = ZOOM_MODEL.servers.find(server => server.id === key.owner);

      expect(colourAt(ZOOM_BEATS.land.to)).not.toBe(owner.color);
      expect(colourAt(ZOOM_BEATS.route.to)).toBe(owner.color);
    });
  });

  /**
   * The act happens after the sweep has stopped. Landing a key on a moving window
   * would slide it along the strip while it fell, which is a key at a position it
   * never had.
   */
  it('waits for the sweep to stop', () => {
    expect(ZOOM_BEATS.land.from).toBeGreaterThanOrEqual(ZOOM_BEATS.pan.to);
    expect(ZOOM_BEATS.route.to).toBeLessThanOrEqual(ZOOM_BEATS.retract.from);
  });
});
