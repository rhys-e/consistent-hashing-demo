import React from 'react';
import { render } from '@testing-library/react';

/**
 * The theme module reads `import.meta.env`, which babel-jest cannot transpile for
 * CommonJS. Only the colour values matter here, and only that both scenes get the
 * same ones.
 */
jest.mock('../../../themes', () => ({
  __esModule: true,
  default: {
    colors: {
      primary: {
        cyberBlue: '#4E79A7',
        tealHologram: '#76B7B2',
        holographicPink: '#D4A6C8',
        virtualGold: '#F1CE63',
      },
      ui: {
        grid: '#1d1e33',
        text: { primary: '#8be9fd', secondary: '#6272a4', bright: '#f8f8f2' },
      },
    },
  },
}));

import HashSpaceNumberLineScene from '../HashSpaceNumberLineScene';
import RangeWrapsIntoRingScene from '../RangeWrapsIntoRingScene';
import { STAGE } from '../../../story/stage';

/** Attributes that carry a layer's geometry rather than its identity. */
const GEOMETRY_ATTRIBUTES = [
  'd',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'cx',
  'cy',
  'r',
  'font-size',
  'letter-spacing',
  'stroke-width',
  'opacity',
  'text-anchor',
  'dominant-baseline',
];

function layerKey(element) {
  const owner = element.closest('[data-key]');
  return [element.dataset.layer, owner?.dataset.key, element.dataset.position]
    .filter(part => part !== undefined)
    .join(':');
}

function describeLayers(container) {
  const described = {};

  container.querySelectorAll('[data-layer]').forEach(element => {
    const geometry = {};

    GEOMETRY_ATTRIBUTES.forEach(attribute => {
      const value = element.getAttribute(attribute);
      if (value !== null) geometry[attribute] = value;
    });

    if (element.tagName === 'text') geometry.text = element.textContent;

    described[layerKey(element)] = geometry;
  });

  return described;
}

/**
 * Scene 1 is Scene 0's number line, bent. Its opening frame therefore has to be
 * the frame Scene 0 finishes on, or the viewer sees a cut where the story claims
 * continuity. Both scenes draw through the shared layers, so this asserts the
 * shared layers really are receiving the same geometry at bend 0.
 */
describe('scene continuity', () => {
  const landed = describeLayers(render(<HashSpaceNumberLineScene pinnedProgress={4} />).container);
  const straight = describeLayers(
    render(<RangeWrapsIntoRingScene pinnedProgress={0.3} />).container
  );

  const sharedKeys = Object.keys(landed).filter(key => key in straight);

  it('draws the same layers in both scenes', () => {
    expect(sharedKeys).toEqual(
      expect.arrayContaining([
        'rail-core',
        'ticks-major',
        'ticks-minor',
        'rail-caps',
        'bounds-label:0',
        'bounds-label:1',
        'key-marker:user-1842',
        'key-annotation:image-91',
        'key-name:session-abc',
        'key-hash:session-abc',
      ])
    );
  });

  it.each([['rail'], ['ticks'], ['bounds'], ['marker'], ['key'], ['stem'], ['scaffold']])(
    'places the %s layers identically',
    prefix => {
      const matching = sharedKeys.filter(key => key.startsWith(prefix));

      expect(matching.length).toBeGreaterThan(0);
      matching.forEach(key => {
        expect({ [key]: straight[key] }).toEqual({ [key]: landed[key] });
      });
    }
  );

  it('leaves the ring-only glow dormant while the rail is straight', () => {
    expect(straight['rail-halo'].opacity).toBe('0');
    expect(straight['rail-bleed'].opacity).toBe('0');
  });

  /**
   * Labels are pushed away from the rail along its normal, so the widest point of
   * the composition is somewhere mid-bend rather than at either end of it.
   */
  it.each([0.3, 0.9, 1.3, 1.8, 2.2, 3])('keeps labels inside the stage at beat %s', beat => {
    const { container } = render(<RangeWrapsIntoRingScene pinnedProgress={beat} />);

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
  });

  it('lights the ring-only glow once the rail has closed', () => {
    const closed = describeLayers(render(<RangeWrapsIntoRingScene pinnedProgress={3} />).container);

    expect(Number(closed['rail-halo'].opacity)).toBeGreaterThan(0);
    expect(Number(closed['rail-bleed'].opacity)).toBeGreaterThan(0);
  });
});
