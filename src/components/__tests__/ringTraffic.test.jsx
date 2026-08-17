import React from 'react';
import { render } from '@testing-library/react';

import HashSpaceScene, { HASH_SPACE_BEATS } from '../HashSpaceScene';
import { mix } from '../../story/easing';
import { STAGE } from '../../story/stage';
import { TRAFFIC, keysAliveAt } from '../RingTraffic';

/** Rests are intervals; a step is the middle of one. */
const mid = interval => (interval.from + interval.to) / 2;

/** A quarter turn in, where the layer has filled to its steady three or four. */
const SETTLED_TURNS = 0.25;

const at = (beat, turns = SETTLED_TURNS) =>
  render(<HashSpaceScene pinnedProgress={beat} pinnedTurns={turns} />).container;
const trafficAt = beat => at(beat).querySelector('[data-layer="ring-traffic"]');

/**
 * Whether the layer exists at all, asked of a clock that is *running* rather than
 * held. Holding it is what lets a still frame show a moving thing, so a held clock
 * renders the layer whatever the beat says — which is right, and useless for
 * asking when the beat lets it start.
 */
const gateAt = beat =>
  render(<HashSpaceScene pinnedProgress={beat} />).container.querySelector(
    '[data-layer="ring-traffic"]'
  );

const lit = (container, selector, attribute = 'opacity') =>
  [...container.querySelectorAll(selector)].map(node => Number(node.getAttribute(attribute) ?? 1));

describe('traffic on the closed ring', () => {
  /**
   * The scene ends on three keys sitting still, which is a true picture of where
   * three keys are and a poor one of what a hash ring is. The traffic says the
   * thing a still frame cannot — that keys keep arriving.
   *
   * It waits for the scene's last claim to land first. That claim is about the
   * ring, and wants the three keys still on it while it is read, so the handover
   * comes after the reading rest rather than during it: two statements, in order,
   * rather than one picture changing under a sentence about something else.
   */
  it('waits for the ring to close and its last line to be read', () => {
    expect(gateAt(0)).toBeNull();
    expect(gateAt(HASH_SPACE_BEATS.morph.from)).toBeNull();
    expect(gateAt(HASH_SPACE_BEATS.closed.from)).toBeNull();
    expect(gateAt(mid(HASH_SPACE_BEATS.joined))).toBeNull();

    expect(gateAt(HASH_SPACE_BEATS.arrive.to)).toBeTruthy();
    expect(gateAt(HASH_SPACE_BEATS.end)).toBeTruthy();
  });

  /**
   * The scene clears itself in one gesture, and *then* the postscript starts.
   *
   * Taking the writing away first and then the three keys one at a time was tried,
   * and it makes the ending a *sequence* — five separate departures to follow, on a
   * slide whose argument finished a beat ago. Everything at once is the slide
   * letting go, which is the only thing left for it to say.
   *
   * An earlier version also interlocked the arrivals with the departures so the ring
   * was never empty, on the reasoning that a gap is a stall. It is — when the only
   * thing leaving is three keys. Once the labels and the commentary go with them the
   * clearing is the event, and the quiet ring afterwards is the beat it lands on.
   * `The ring alone` is a step, so it is a frame the story stops at.
   */
  it('clears everything it has said in one go, before anything arrives', () => {
    const everything = beat => [
      ...lit(at(beat), '[data-layer="bounds-label"]'),
      ...lit(at(beat), '[data-layer="annotation"]'),
      ...lit(at(beat), '[data-layer="key-marker"]'),
      ...lit(at(beat), '[data-layer="key-annotation"]'),
    ];

    const { clear, bare } = HASH_SPACE_BEATS;

    // All up while the last line is being read.
    expect(everything(clear.from).every(value => value === 1)).toBe(true);

    // Going together, so there is one number on screen rather than five.
    const partway = everything(mix(clear.from, clear.to, 0.5));
    expect(Math.max(...partway) - Math.min(...partway)).toBeLessThan(0.02);
    expect(Math.max(...partway)).toBeLessThan(1);
    expect(Math.max(...partway)).toBeGreaterThan(0);

    // And by the bare rest there is nothing on the ring but the ring.
    expect(everything(mid(bare)).every(value => value === 0)).toBe(true);
    expect(gateAt(mid(bare))).toBeNull();
  });

  /**
   * A step lands where nothing is moving, and this never stops moving. The two are
   * irreconcilable unless the rest guard steps over it, which is what
   * `data-ephemeral` is for — the same exemption the arrival glow and the seam
   * pulse take. `sceneRests.test.jsx` is what would otherwise fail.
   */
  it('is decoration, and marked as such', () => {
    expect(trafficAt(HASH_SPACE_BEATS.end).dataset.ephemeral).toBe('true');
  });

  /**
   * They are keys, so they are named.
   *
   * Unnamed dots read as particles, and a ring with particles landing on it is
   * being decorated rather than used — you could watch it and not notice anything
   * was arriving. What still separates them from the three the scene made claims
   * about is that those three carried a hash value and a stem back to their
   * position, and these carry a name and nothing else.
   */
  it('names them, because an unnamed dot is not a key', () => {
    const names = [...trafficAt(HASH_SPACE_BEATS.busy.from + 0.5).querySelectorAll('text')].map(
      node => node.textContent
    );

    expect(names.length).toBeGreaterThan(0);
    names.forEach(name => expect(name).toMatch(/^(user|image|session|cart|post):/));
    names.forEach(name => expect(name).not.toMatch(/^0x/));
  });

  /**
   * A name has to be far enough inside the ring to clear its own mark and, more to
   * the point, the mark of whatever else is on the ring nearby — at half this a
   * name could sit against a neighbouring key and read as belonging to it.
   */
  it('keeps a name clear of every mark on the ring', () => {
    const container = at(HASH_SPACE_BEATS.busy.from + 0.5);
    const shown = selector =>
      [...container.querySelectorAll(selector)].filter(
        node => Number(node.getAttribute('opacity') ?? 1) > 0.05
      );

    const dots = shown('[data-layer="traffic-mark"]').map(node => ({
      x: Number(node.getAttribute('cx')),
      y: Number(node.getAttribute('cy')),
    }));
    const labels = shown('[data-layer="traffic-name"]');

    expect(labels.length).toBeGreaterThan(0);
    labels.forEach(label => {
      const x = Number(label.getAttribute('x'));
      const y = Number(label.getAttribute('y'));
      const nearest = Math.min(...dots.map(dot => Math.hypot(dot.x - x, dot.y - y)));

      expect(nearest).toBeGreaterThan(30);
    });
  });

  /**
   * Quieter than the keys the scene made claims about, though never so quiet as to
   * be missable — the first version had them unnamed at half opacity and you could
   * watch the ring without noticing anything was landing on it.
   */
  it('draws a shade under the keys the scene named', () => {
    const traffic = Math.max(
      ...lit(at(HASH_SPACE_BEATS.busy.from + 0.5), '[data-layer="traffic-mark"]')
    );
    const named = Math.max(...lit(at(mid(HASH_SPACE_BEATS.joined)), '[data-layer="marker-core"]'));

    expect(traffic).toBeLessThan(named);
    expect(traffic).toBeGreaterThan(0.6);
  });

  /**
   * Two things had to be true at once and a plain hash gave neither.
   *
   * Eighteen raw hash positions put the closest pair nine ten-thousandths of the
   * ring apart — about a pixel and a half — so two keys arrived on top of each
   * other. And keys that arrive one after another are neighbours in the pool, so
   * evenly spacing them instead would have marched them round the ring in order
   * like a clock hand.
   *
   * Slots with a bounded wobble give the separation; a stride co-prime to the count
   * gives the scatter in time. This is decoration and makes no claim about how a
   * hash distributes anything — the scene spent a minute doing that with three real
   * positions — but it has to be legible.
   */
  it('scatters the pool in space and in time', () => {
    const container = at(HASH_SPACE_BEATS.busy.from + 0.5);
    const marks = [...container.querySelectorAll('[data-layer="traffic-mark"]')]
      .filter(node => Number(node.getAttribute('opacity')) > 0.05)
      .map(node => ({ x: Number(node.getAttribute('cx')), y: Number(node.getAttribute('cy')) }));

    expect(marks.length).toBeGreaterThan(1);
    // Nothing on screen together is anywhere near touching.
    marks.forEach((one, index) => {
      marks.slice(index + 1).forEach(other => {
        expect(Math.hypot(one.x - other.x, one.y - other.y)).toBeGreaterThan(40);
      });
    });
  });

  /** And nothing it draws leaves the stage, which the labels used to do. */
  it('keeps every mark and name on the stage', () => {
    const busy = HASH_SPACE_BEATS.busy;

    for (let step = 0; step <= 8; step += 1) {
      const container = at(busy.from + ((busy.to - busy.from) * step) / 8);
      const shown = [
        ...container.querySelectorAll('[data-layer="traffic-mark"], [data-layer="traffic-name"]'),
      ].filter(node => Number(node.getAttribute('opacity')) > 0.05);

      shown.forEach(node => {
        const x = Number(node.getAttribute('cx') ?? node.getAttribute('x'));
        const y = Number(node.getAttribute('cy') ?? node.getAttribute('y'));
        if (!Number.isFinite(x)) return;

        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(STAGE.width);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(STAGE.height);
      });
    }
  });
});

/**
 * `easeInOutCubic` is the right curve for a thing travelling: it leaves and arrives
 * softly and spends its speed in the middle, where there is somewhere to spend it.
 * Its peak slope is *three*, though, and a fade has nowhere to put that — an
 * opacity crossing its whole range at three times the average rate reads as being
 * switched on however long the whole movement takes.
 *
 * The ring's cyan edge used to arrive that way, and worse: it thresholded the
 * already-eased bend, which is easing twice, and took the steepest 45% of a cubic
 * and stretched it to nothing-to-everything. It crossed its range in 0.65 seconds
 * of a 2.7 second bend.
 */
describe('the ring resolving out of the line', () => {
  const SECONDS_PER_BEAT = 1.5;

  const crossingOf = layer => {
    const { morph } = HASH_SPACE_BEATS;
    const seconds = (morph.to - morph.from) * SECONDS_PER_BEAT;
    const steps = 60;
    let first = null;
    let last = null;

    for (let step = 0; step <= steps; step += 1) {
      const beat = morph.from + ((morph.to - morph.from) * step) / steps;
      const node = at(beat).querySelector(`[data-layer="${layer}"]`);
      const styled = node.style.opacity;
      const value = Number(styled !== '' ? styled : (node.getAttribute('opacity') ?? 1));
      const share = value / 0.18;

      if (first === null && share >= 0.1) first = (step / steps) * seconds;
      if (share >= 0.9) {
        last = (step / steps) * seconds;
        break;
      }
    }

    return last - first;
  };

  it('resolves the cyan edge slowly enough to read as resolving', () => {
    // Comfortably longer than the 0.65s it used to take, on the same 2.7s bend.
    expect(crossingOf('rail-bleed')).toBeGreaterThan(1);
  });
});

/**
 * The clock counts turns rather than resetting every turn, and a key has not
 * started until the clock has come round to it. So on the first turn they arrive
 * one at a time, about a second apart, building to the three or four the layer
 * settles at.
 *
 * Without that, every key whose window happened to contain the starting instant
 * appeared together — the moment the layer switched on, three keys landed at once.
 * That is the same information delivered as an event rather than as a stream, and a
 * stream is the entire point.
 *
 * The clock is wall time, so a pinned beat cannot reach any of this. Arithmetic is
 * the only place the ramp is observable.
 */
describe('the traffic building up', () => {
  const secondsIn = seconds => keysAliveAt(seconds / TRAFFIC.cycleSeconds);

  it('starts with one and builds, rather than arriving as a handful', () => {
    const spacing = TRAFFIC.cycleSeconds / TRAFFIC.count;

    expect(secondsIn(0)).toBe(1);
    // One more each time the clock comes round to the next of them, rather than
    // three the moment the layer switches on.
    expect(secondsIn(spacing * 1.1)).toBe(2);
    expect(secondsIn(spacing * 2.1)).toBe(3);
  });

  it('settles at three or four and stays there', () => {
    const settled = Math.ceil(TRAFFIC.cycleSeconds * TRAFFIC.life);

    for (let second = settled; second <= 90; second += 1) {
      const alive = secondsIn(second);

      expect(alive).toBeGreaterThanOrEqual(3);
      expect(alive).toBeLessThanOrEqual(4);
    }
  });

  /** And a full turn later it is still a stream, not a burst on the hour. */
  it('does not bunch up when the clock comes round again', () => {
    const turn = TRAFFIC.cycleSeconds;

    [turn - 1, turn, turn + 1, turn + 2].forEach(second => {
      expect(secondsIn(second)).toBeLessThanOrEqual(4);
    });
  });

  /**
   * The first thing a viewer sees is one key arriving from nothing.
   *
   * It used to sometimes be a key already half gone. The clock kept running when a
   * scene rewound — which happens whenever its slide is travelled back to — so the
   * next play-through opened on whatever the pool happened to be doing. The clock is
   * now put back when the layer goes, so the stream always starts at its beginning.
   */
  it('opens on one key, arriving from nothing', () => {
    const marksAt = turns =>
      [
        ...at(HASH_SPACE_BEATS.busy.from + 0.5, turns).querySelectorAll(
          '[data-layer="traffic-mark"]'
        ),
      ]
        .map(node => Number(node.getAttribute('opacity')))
        .filter(value => value > 0);

    // Nothing yet, and one key on its way.
    expect(marksAt(0)).toEqual([]);
    expect(keysAliveAt(0)).toBe(1);

    // Still only the one, a second in.
    const rising = marksAt(1 / TRAFFIC.cycleSeconds);
    expect(rising).toHaveLength(1);
    expect(rising[0]).toBeGreaterThan(0);
    expect(rising[0]).toBeLessThan(TRAFFIC.peakOpacity);

    // And it is alone for a while: the second does not land on top of it.
    expect(keysAliveAt(2 / TRAFFIC.cycleSeconds)).toBe(1);
  });

  /**
   * A key spends most of its life *being there* rather than arriving or leaving.
   * One that fades for as long as it holds reads as a pulse, and the point is that
   * it landed.
   */
  it('gives a key more time on the ring than getting on or off it', () => {
    const seconds = TRAFFIC.cycleSeconds * TRAFFIC.life;
    const opacityAt = phase =>
      Number(
        at(HASH_SPACE_BEATS.busy.from + 0.5, phase * TRAFFIC.life)
          .querySelector('[data-layer="traffic-mark"]')
          .getAttribute('opacity')
      );

    expect(seconds).toBeGreaterThan(7);

    // Full by a sixth of the way in, and still full past two thirds.
    expect(opacityAt(0.2)).toBeCloseTo(TRAFFIC.peakOpacity, 2);
    expect(opacityAt(0.65)).toBeCloseTo(TRAFFIC.peakOpacity, 2);
  });
});
