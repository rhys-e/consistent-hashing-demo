import {
  TAU,
  buildArcPath,
  getArcCentre,
  getArcRadius,
  getNormalRotation,
  projectOffset,
  projectPosition,
  ringArcPath,
  ringPoint,
} from '../projection';

const RAIL = { length: 800, anchorX: 520, anchorY: 200 };

function project(position, bend) {
  return projectPosition({ position, bend, ...RAIL });
}

function measureArcLength(bend, samples = 4000) {
  let total = 0;
  let previous = project(0, bend);

  for (let step = 1; step <= samples; step++) {
    const current = project(step / samples, bend);
    total += Math.hypot(current.x - previous.x, current.y - previous.y);
    previous = current;
  }

  return total;
}

function chordLength(fromPosition, toPosition, bend) {
  const from = project(fromPosition, bend);
  const to = project(toPosition, bend);
  return Math.hypot(to.x - from.x, to.y - from.y);
}

describe('projection', () => {
  describe('while straight', () => {
    it('lays positions out left to right across the rail', () => {
      expect(project(0, 0)).toMatchObject({ x: 120, y: 200 });
      expect(project(0.5, 0)).toMatchObject({ x: 520, y: 200 });
      expect(project(1, 0)).toMatchObject({ x: 920, y: 200 });
    });

    it('has no radius or centre', () => {
      expect(getArcRadius({ bend: 0, length: RAIL.length })).toBe(Infinity);
      expect(getArcCentre({ bend: 0, ...RAIL })).toBeNull();
    });

    it('treats the outward normal as straight up so offsets are vertical', () => {
      const offset = projectOffset({ position: 0.3, bend: 0, ...RAIL, offset: 40 });
      expect(offset.x).toBeCloseTo(project(0.3, 0).x, 6);
      expect(offset.y).toBeCloseTo(160, 6);
    });

    it('does not rotate labels', () => {
      expect(getNormalRotation({ position: 0.2, bend: 0 })).toBe(0);
    });
  });

  describe('when fully closed into a ring', () => {
    const radius = RAIL.length / TAU;

    it('derives its radius from the fixed arc length', () => {
      expect(getArcRadius({ bend: 1, length: RAIL.length })).toBeCloseTo(radius, 9);
      expect(getArcCentre({ bend: 1, ...RAIL })).toMatchObject({
        x: RAIL.anchorX,
        y: RAIL.anchorY + radius,
      });
    });

    it('closes the seam so the first and last positions coincide', () => {
      const start = project(0, 1);
      const end = project(1, 1);

      expect(end.x).toBeCloseTo(start.x, 6);
      expect(end.y).toBeCloseTo(start.y, 6);
    });

    it('places the seam at the bottom and the rail midpoint at the top', () => {
      expect(project(0, 1).y).toBeCloseTo(RAIL.anchorY + 2 * radius, 6);
      expect(project(0.5, 1).y).toBeCloseTo(RAIL.anchorY, 6);
    });

    it('advances clockwise in screen coordinates', () => {
      // Screen y grows downward, so bottom -> left -> top -> right is clockwise.
      expect(project(0, 1)).toMatchObject({ x: expect.closeTo(RAIL.anchorX, 6) });
      expect(project(0.25, 1).x).toBeCloseTo(RAIL.anchorX - radius, 6);
      expect(project(0.5, 1).x).toBeCloseTo(RAIL.anchorX, 6);
      expect(project(0.75, 1).x).toBeCloseTo(RAIL.anchorX + radius, 6);

      // At the top of the ring a clockwise path heads in +x.
      const atTop = project(0.5, 1);
      expect(atTop.tangentX).toBeCloseTo(1, 6);
      expect(atTop.tangentY).toBeCloseTo(0, 6);
    });

    it('points offsets radially outward', () => {
      const atTop = projectOffset({ position: 0.5, bend: 1, ...RAIL, offset: 20 });
      const atSeam = projectOffset({ position: 0, bend: 1, ...RAIL, offset: 20 });

      expect(atTop.y).toBeCloseTo(RAIL.anchorY - 20, 6);
      expect(atSeam.y).toBeCloseTo(RAIL.anchorY + 2 * radius + 20, 6);
    });
  });

  describe('invariants across the morph', () => {
    const bends = [0, 1e-6, 0.05, 0.25, 0.5, 0.75, 1];

    it.each(bends)('preserves arc length at bend %p', bend => {
      expect(measureArcLength(bend)).toBeCloseTo(RAIL.length, 1);
    });

    it.each(bends)('keeps equal position deltas equally spaced at bend %p', bend => {
      expect(chordLength(0.1, 0.2, bend)).toBeCloseTo(chordLength(0.6, 0.7, bend), 6);
    });

    it('is continuous across the straight-line threshold', () => {
      const straight = project(0.2, 0);
      const barelyBent = project(0.2, 1e-6);
      const drift = Math.hypot(barelyBent.x - straight.x, barelyBent.y - straight.y);

      // The arc sags by L(p - 0.5)^2 * theta / 2, so the only guarantee that
      // matters is that switching formulas never moves anything a visible amount.
      expect(drift).toBeLessThan(0.01);
    });

    it('keeps the rail midpoint pinned to the anchor at every bend', () => {
      bends.forEach(bend => {
        const midpoint = project(0.5, bend);
        expect(midpoint.x).toBeCloseTo(RAIL.anchorX, 6);
        expect(midpoint.y).toBeCloseTo(RAIL.anchorY, 6);
      });
    });

    it('projects positions beyond the seam by wrapping around the ring', () => {
      const wrapped = project(1.25, 1);
      const equivalent = project(0.25, 1);

      expect(wrapped.x).toBeCloseTo(equivalent.x, 6);
      expect(wrapped.y).toBeCloseTo(equivalent.y, 6);
    });
  });

  describe('buildArcPath', () => {
    it('emits a polyline with one command per segment boundary', () => {
      const path = buildArcPath({ bend: 0.5, ...RAIL, segments: 8 });
      const commands = path.split(/(?=[ML])/).filter(Boolean);

      expect(path.startsWith('M ')).toBe(true);
      expect(commands).toHaveLength(9);
    });

    it('returns to its start once fully closed', () => {
      const path = buildArcPath({ bend: 1, ...RAIL, segments: 180 });
      const points = path.match(/-?\d+\.\d+/g).map(Number);
      const [firstX, firstY] = points;
      const lastY = points[points.length - 1];
      const lastX = points[points.length - 2];

      expect(lastX).toBeCloseTo(firstX, 2);
      expect(lastY).toBeCloseTo(firstY, 2);
    });

    it('can draw a partial rail for draw-on animation', () => {
      const path = buildArcPath({ bend: 0, ...RAIL, from: 0, to: 0.5, segments: 2 });

      expect(path).toBe('M 120.000 200.000 L 320.000 200.000 L 520.000 200.000');
    });
  });

  /**
   * The full-scale scenes draw rings directly rather than by bending a rail, so
   * this is what keeps them agreeing with the morph about where a position is.
   */
  describe('ringPoint', () => {
    const RING = { centreX: 400, centreY: 300, radius: 120 };

    it('matches the closed morph', () => {
      const radius = getArcRadius({ bend: 1, length: RAIL.length });
      const centre = getArcCentre({ bend: 1, ...RAIL });

      [0, 0.2, 0.5, 0.87].forEach(position => {
        const bent = project(position, 1);
        const direct = ringPoint({
          centreX: centre.x,
          centreY: centre.y,
          radius,
          position,
        });

        expect(direct.x).toBeCloseTo(bent.x, 6);
        expect(direct.y).toBeCloseTo(bent.y, 6);
      });
    });

    it('puts the midpoint at the top and the seam at the bottom', () => {
      expect(ringPoint({ ...RING, position: 0.5 })).toMatchObject({ x: 400, y: 180 });
      expect(ringPoint({ ...RING, position: 0 }).y).toBeCloseTo(420, 6);
    });

    it('runs clockwise', () => {
      expect(ringPoint({ ...RING, position: 0.75 }).x).toBeCloseTo(520, 6);
      expect(ringPoint({ ...RING, position: 0.25 }).x).toBeCloseTo(280, 6);
    });
  });

  describe('ringArcPath', () => {
    const RING = { centreX: 0, centreY: 0, radius: 100 };

    it('sweeps clockwise, taking the long way only when the range is over half', () => {
      expect(ringArcPath({ ...RING, from: 0.1, to: 0.3 })).toMatch(/A 100.00 100.00 0 0 1/);
      expect(ringArcPath({ ...RING, from: 0.1, to: 0.9 })).toMatch(/A 100.00 100.00 0 1 1/);
    });
  });
});
