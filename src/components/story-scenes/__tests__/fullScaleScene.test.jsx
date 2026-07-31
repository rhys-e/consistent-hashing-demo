import React from 'react';
import { render } from '@testing-library/react';

import { LanesSeparateScene, ServerJoinsScene } from '../FullScaleScene';
import { LANE_BEATS, LAYOUT } from '../FullScaleLanes';
import { annotationAt, narrationPresenceAt } from '../../../story/sceneSteps';

const radiiOf = element => {
  const { container } = render(element);
  return [
    ...new Set(
      [...container.querySelectorAll('circle')]
        .map(circle => Number(circle.getAttribute('r')))
        .filter(Number.isFinite)
    ),
  ];
};

describe('full scale scenes', () => {
  it('opens the separating scene on the shared ring', () => {
    expect(radiiOf(<LanesSeparateScene pinnedProgress={0.5} />)).toEqual([LAYOUT.referenceRadius]);
  });

  /**
   * The join scene is the whole arc, ring to ring: it opens on the shared ring,
   * takes it apart, hands a server's worth of ranges over, and puts it back. Cut
   * before the fold-back and the concentric lanes start to look like a structure
   * the system has rather than a way of looking at one.
   *
   * Worth asserting because the failure mode is quiet — the artwork used to build
   * its own copy of the timeline, so scene and drawing could disagree about which
   * phase they were in, and every test passed because none of them looked at what
   * was drawn.
   */
  it('opens the joining scene on the shared ring and ends on it', () => {
    expect(radiiOf(<ServerJoinsScene pinnedProgress={0.5} />)).toEqual([LAYOUT.referenceRadius]);
    expect(radiiOf(<ServerJoinsScene pinnedProgress={LANE_BEATS.end} />)).toEqual([
      LAYOUT.referenceRadius,
    ]);
  });

  it('separates into one lane per server partway through', () => {
    const radii = radiiOf(<ServerJoinsScene pinnedProgress={LANE_BEATS.settled} />);

    expect(radii).toContain(LAYOUT.referenceRadius);
    // One radius per lane, plus the reference ring they sit inside.
    expect(radii.length).toBe(8);
  });

  /**
   * The rule an annotation exists to keep: it stands beside the artwork, never
   * over it. If a line ever ends up in `narrations` as well, the thing it points
   * at is blurred out from under it and we are back to the device this replaced.
   */
  it('never blurs the artwork while an annotation is standing', () => {
    const { annotations, end } = LANE_BEATS;
    expect(annotations.length).toBe(2);

    annotations.forEach(({ from }, index) => {
      const until = annotations[index + 1]?.from ?? end;
      for (let at = from; at <= until; at += (until - from) / 20) {
        expect(narrationPresenceAt(LANE_BEATS, at)).toBe(0);
      }
    });
  });

  /**
   * Standing commentary, not a note put up and taken down: each line holds until
   * there is something else to say, and the last one holds to the end of the scene.
   * The failure this guards against is silent — a line that expires leaves the
   * column empty for the whole fold-back, which looks like a scene with nothing
   * to say rather than a bug.
   */
  it('leaves each line up until the next one replaces it', () => {
    const [first, second] = LANE_BEATS.annotations;

    expect(annotationAt(LANE_BEATS, first.from - 0.01)).toBeNull();
    expect(annotationAt(LANE_BEATS, LANE_BEATS.handover.to)).toBe(first.text);
    expect(annotationAt(LANE_BEATS, LANE_BEATS.merge.to)).toBe(first.text);
    expect(annotationAt(LANE_BEATS, second.from)).toBe(second.text);
    expect(annotationAt(LANE_BEATS, LANE_BEATS.end)).toBe(second.text);
  });

  /**
   * The roster changes before the ring does. Six lanes giving something up only
   * means anything if you already know a seventh server has turned up, so the
   * newcomer arrives first as a row sliding into the table, and the ring is left
   * alone while that lands.
   */
  it('gives the newcomer a row before it gives it a lane', () => {
    const rowAt = (at, id) => {
      const { container } = render(<ServerJoinsScene pinnedProgress={at} />);
      return container.querySelector(`[data-layer="row:${id}"]`);
    };

    // Read as an attribute and a CSS property respectively, because that is where
    // motion actually puts them — asserting against `style.opacity` passes on the
    // empty string, which is how this test first passed while drawing nothing.
    const shiftOf = row => Number(/translateX\((-?[\d.]+)px\)/.exec(row.style.transform)?.[1] ?? 0);

    const before = rowAt(LANE_BEATS.settled, 'cache-07');
    expect(before.getAttribute('opacity')).toBe('0');
    // Waiting off the right-hand edge, so arriving is a move rather than a fade-up.
    expect(shiftOf(before)).toBe(44);

    const after = rowAt(LANE_BEATS.roster.to, 'cache-07');
    expect(after.getAttribute('opacity')).toBe('1');
    expect(shiftOf(after)).toBe(0);

    // The servers already on the ring do not move while it happens.
    expect(shiftOf(rowAt(LANE_BEATS.settled, 'cache-01'))).toBe(0);
  });
});
