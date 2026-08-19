import React from 'react';
import { render } from '@testing-library/react';

import KeyRoutesScene from '../KeyRoutesScene';
import ServerLeavesScene from '../ServerLeavesScene';
import { LOOKUP_BEATS, LOOKUP_MODEL } from '../LookupRing';
import { REMOVAL_BEATS } from '../RemovalRing';

/** Attributes that carry what a frame looks like. */
const DRAWN = ['d', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'points', 'fill', 'stroke-dasharray'];

/**
 * The ring only — not the panel or the words beside it, which are what each scene
 * has that the other does not.
 */
function ringFrame(element) {
  const { container } = render(element);
  const frame = [];

  container.querySelectorAll('[data-layer]').forEach(layer => {
    const name = layer.dataset.layer;
    if (!/^(arc|marker|key):/.test(name)) return;

    layer.querySelectorAll('*').forEach(node => {
      DRAWN.forEach(attribute => {
        const value = node.getAttribute(attribute);
        if (value !== null) frame.push(`${name}.${node.tagName}.${attribute}=${value}`);
      });
    });
  });

  return frame.join('\n');
}

describe('the lookup scene', () => {
  it('ends on exactly the frame the removal scene opens on', () => {
    const ending = ringFrame(<KeyRoutesScene pinnedProgress={LOOKUP_BEATS.settled} />);

    expect(ringFrame(<ServerLeavesScene pinnedProgress={0} />)).toBe(ending);
    expect(ringFrame(<ServerLeavesScene pinnedProgress={REMOVAL_BEATS.settled} />)).toBe(ending);
  });

  /**
   * A key has no colour until the lookup has answered. Colouring it on arrival is
   * the scene showing its working; colouring it up front would be showing the
   * answer and then demonstrating the question.
   */
  it('leaves a key uncoloured until its own lookup arrives', () => {
    const colourOf = (beat, name) => {
      const { container } = render(<KeyRoutesScene pinnedProgress={beat} />);
      return container.querySelector(`[data-layer="key:${name}"] polygon`).getAttribute('fill');
    };
    const serverColours = new Set(LOOKUP_MODEL.servers.map(server => server.color));

    LOOKUP_MODEL.keys.forEach(key => {
      const route = LOOKUP_BEATS.routes.get(key.name);
      expect(serverColours.has(colourOf(route.from, key.name))).toBe(false);
      expect(colourOf(route.to, key.name)).toBe(
        LOOKUP_MODEL.servers.find(server => server.id === key.owner).color
      );
    });
  });

  /**
   * The rule, as data: every key routes forwards to the first server it meets.
   * If `travel` ever ran the other way the particle would still animate happily
   * and teach the opposite of the lookup.
   */
  it('routes every key forwards to its own server', () => {
    LOOKUP_MODEL.keys.forEach(key => {
      const server = LOOKUP_MODEL.topology.vnodes.find(vnode => vnode.serverId === key.owner);
      const arrival = (key.position + key.travel) % 1;

      expect(arrival).toBeCloseTo(server.position, 9);
      expect(key.travel).toBeGreaterThan(0);
      // Nothing travels further than the arc that receives it, or it would have
      // passed a nearer server on the way.
      expect(key.travel).toBeLessThanOrEqual(
        LOOKUP_MODEL.arcs.find(arc => arc.serverId === key.owner).span + 1e-9
      );
    });
  });

  it('teaches one key before the rest, and one per server', () => {
    const routes = [...LOOKUP_BEATS.routes.entries()];
    const [firstName] = routes[0];
    const first = LOOKUP_MODEL.keys.find(key => key.name === firstName);
    const taught = routes.slice(0, 3).map(([name]) => LOOKUP_MODEL.keys.find(k => k.name === name));

    // The opening scene already introduced this key, so the only new thing in the
    // first lookup is the lookup.
    expect(firstName).toBe('user:1842');
    expect(new Set(taught.map(key => key.owner)).size).toBe(LOOKUP_MODEL.servers.length);
    // Slow enough to be read: the taught one takes longer than any that follow.
    const span = ([, window]) => window.to - window.from;
    expect(span(routes[0])).toBeGreaterThan(span(routes[1]));
    expect(first.travel).toBeGreaterThan(0.1);
  });

  /**
   * The ring was the one thing in the story that arrived without having come from
   * anywhere — simply present on the first frame, where every other mark grows,
   * sweeps, falls or resolves. It now draws itself round from the seam, in the same
   * `pathLength="1"` dash units the ownership arcs use, so it is made of the device
   * the rest of the scene is made of rather than a second one.
   *
   * The seam tick waits for the ring to come back round to it, which makes the seam
   * the place the ring was drawn *from* rather than a mark that happened to be
   * there first.
   */
  it('draws the ring round from the seam before anything is on it', () => {
    const frameAt = beat => {
      const { container } = render(<KeyRoutesScene pinnedProgress={beat} />);
      const drawn = container
        .querySelector('[data-layer="reference-ring"]')
        .getAttribute('stroke-dasharray');

      const [dash, gap] = drawn.split(' ').map(Number);

      return {
        drawn: dash,
        // The gap has to be the *rest* of the circle. A pattern longer than the
        // path draws whatever is left of its first dash after the offset and then
        // stops, which is how this first shipped: a quarter of the ring, at every
        // value of `drawn`.
        pattern: dash + gap,
        seam: Number(container.querySelector('[data-layer="seam"]').getAttribute('opacity')),
      };
    };

    const { ringIn } = LOOKUP_BEATS;
    expect(frameAt(0).drawn).toBe(0);
    expect(frameAt(0).seam).toBe(0);

    const half = frameAt((ringIn.from + ringIn.to) / 2);
    expect(half.drawn).toBeGreaterThan(0.3);
    expect(half.drawn).toBeLessThan(0.7);
    // One turn of the circle, so exactly one dash goes on it.
    expect(half.pattern).toBeCloseTo(1, 3);
    // Still nothing at the seam: it arrives once the ring has come back to it.
    expect(half.seam).toBe(0);

    // Whole, and stays whole for the rest of the scene.
    expect(frameAt(ringIn.to).drawn).toBe(1);
    expect(frameAt(ringIn.to).seam).toBeGreaterThan(0.4);
    expect(frameAt(LOOKUP_BEATS.settled).drawn).toBe(1);
  });
});
