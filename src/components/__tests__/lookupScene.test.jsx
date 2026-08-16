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
  /**
   * Scenes 2 and 3 are consecutive slides on the same ring, so the cut between
   * them has to be no cut at all.
   *
   * This is the check that keeps that true rather than merely intended. The two
   * scenes are separate components with separate timelines, and every retiming or
   * geometry tweak in either is a chance for them to disagree by a few units —
   * which reads to a viewer as the ring jumping at a slide boundary, and is
   * invisible to anyone testing either scene alone.
   */
  it('ends on exactly the frame the removal scene opens on', () => {
    const ending = ringFrame(<KeyRoutesScene pinnedProgress={LOOKUP_BEATS.settled} />);

    // Beat zero, not merely the settled rest. Scene 3 used to land its own markers
    // and sweep its own arcs before arriving here, which spent its first third
    // rebuilding a picture the viewer was already looking at. It now opens
    // assembled, and that is only continuity if the very first frame matches.
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
});
