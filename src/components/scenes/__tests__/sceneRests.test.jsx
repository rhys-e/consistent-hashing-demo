import React from 'react';
import { render } from '@testing-library/react';

import FullScaleScene from '../FullScaleScene';
import HashSpaceScene, { SCENE_STEPS as HASH_SPACE_STEPS } from '../HashSpaceScene';
import { buildLaneSteps, buildLaneTimeline } from '../../ring/FullScaleLanes';
import KeyRoutesScene from '../KeyRoutesScene';
import { LOOKUP_STEPS } from '../../ring/LookupRing';
import ServerLeavesScene from '../ServerLeavesScene';
import VirtualNodesScene from '../VirtualNodesScene';
import ZoomDensityScene from '../ZoomDensityScene';
import { ZOOM_STEPS } from '../../ring/DensityZoom';
import { SPREAD_STEPS } from '../../ring/SpreadRing';
import { REMOVAL_STEPS } from '../../ring/RemovalRing';
import { JOINING_SERVER, SAMPLE_SERVERS } from '../../../story/topology';

/** Attributes that carry what a frame looks like. */
const DRAWN = ['d', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'opacity', 'stroke-width'];

/**
 * A frame, ignoring anything the scene has declared to be decoration. Ephemeral
 * layers are glow and pulse: they are allowed to still be moving at a rest,
 * because a scene should not have to wait for its own glitter.
 */
function frameAt(renderScene, beat) {
  const { container } = render(renderScene(beat));
  const frame = [];

  container.querySelectorAll('[data-layer], [data-ephemeral]').forEach(element => {
    if (element.closest('[data-ephemeral]')) return;

    DRAWN.forEach(attribute => {
      const value = element.getAttribute(attribute);
      if (value !== null) frame.push(`${element.dataset.layer}.${attribute}=${value}`);
    });

    if (element.tagName === 'text')
      frame.push(`${element.dataset.layer}.text=${element.textContent}`);
  });

  return frame.join('\n');
}

/** Either side of each step, the frame must be identical. Assert a frame exists first. */
function expectRestsAt(renderScene, steps) {
  const failures = [];

  expect(frameAt(renderScene, steps[0].at).length).toBeGreaterThan(0);

  steps.forEach(step => {
    const margin = step.rest ? Math.min(0.08, (step.rest.to - step.rest.from) / 2.5) : 0.06;
    const before = frameAt(renderScene, Math.max(0, step.at - margin));
    const at = frameAt(renderScene, step.at);
    const after = frameAt(renderScene, step.at + margin);

    if (before !== at)
      failures.push(`${step.label} (beat ${step.at.toFixed(2)}): still moving into it`);
    else if (at !== after)
      failures.push(`${step.label} (beat ${step.at.toFixed(2)}): next movement already started`);
  });

  expect(failures).toEqual([]);
}

describe('scene rests', () => {
  it('rests at every step of the hash space scene', () => {
    expectRestsAt(beat => <HashSpaceScene pinnedProgress={beat} />, HASH_SPACE_STEPS);
  });

  it('rests at every step of the separating scene', () => {
    const steps = buildLaneSteps(buildLaneTimeline(6), SAMPLE_SERVERS, false);
    expectRestsAt(beat => <FullScaleScene pinnedProgress={beat} />, steps);
  });

  it('rests at every step of the lookup scene', () => {
    expectRestsAt(beat => <KeyRoutesScene pinnedProgress={beat} />, LOOKUP_STEPS);
  });

  it('rests at every step of the removal scene', () => {
    expectRestsAt(beat => <ServerLeavesScene pinnedProgress={beat} />, REMOVAL_STEPS);
  });

  it('rests at every step of the virtual nodes scene', () => {
    expectRestsAt(beat => <VirtualNodesScene pinnedProgress={beat} />, SPREAD_STEPS);
  });

  it('rests at every step of the density scene', () => {
    expectRestsAt(beat => <ZoomDensityScene pinnedProgress={beat} />, ZOOM_STEPS);
  });

  it('rests at every step of the joining scene', () => {
    const steps = buildLaneSteps(buildLaneTimeline(7), [...SAMPLE_SERVERS, JOINING_SERVER], true);
    expectRestsAt(beat => <FullScaleScene showRemap pinnedProgress={beat} />, steps);
  });
});
