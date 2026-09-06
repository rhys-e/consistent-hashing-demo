/**
 * Shared stage geometry for the opening scenes.
 *
 * Scene 0 and Scene 1 must share the same viewBox and straight-rail length so
 * that `preserveAspectRatio="meet"` produces the same on-screen scale. Without
 * that, Storybook shows the number line at one size and the wrap scene at
 * another, which breaks the illusion that Scene 1 is the same rail bending.
 */
/** Ring placement on the stage. Models use this too: pixel gaps need the radius. */
export const RING = {
  centreX: 392,
  centreY: 310,
  radius: 232,
  panel: { x: 760, y: 185, width: 300 },
  annotation: { x: 760, y: 420, width: 300 },
};

/** The circumference, which is what a gap measured in pixels is a fraction of. */
export const RING_CIRCUMFERENCE = 2 * Math.PI * RING.radius;

export const STAGE = {
  width: 1100,
  height: 620,
  anchorX: 550,
  centreY: 310,
  railLength: {
    straight: 920,
    // Longer when closed so the ring remains imposing; relative spacing is
    // preserved, which is what lets keys stay trackable through the morph.
    closed: 1680,
  },
  ticks: {
    count: 16,
    majorEvery: 4,
    minorLength: 7,
    majorLength: 15,
  },
  capHeight: 14,
  /**
   * Text sits at a signed distance from the rail rather than at a y coordinate,
   * so the same numbers describe "above the line" and "outside the ring".
   */
  text: {
    annotation: {
      stemInner: 16,
      stemOuter: 62,
      /**
       * The two lines of an annotation sit either side of one anchor point rather
       * than at two distances from the rail. Text is horizontal wherever it is on
       * the ring, so its lines have to separate vertically; stacking them along
       * the normal would fold them onto each other at the ring's sides.
       */
      labelAnchor: 92,
      lineGap: 12,
    },
    bounds: {
      offset: -32,
      /**
       * Once the ends become neighbours they need room from each other, so the
       * seam can read as two values meeting rather than one run of digits.
       */
      seamGap: 14,
    },
    fontSize: { key: 15, hash: 12, bounds: 12 },
    letterSpacing: { key: 0.6, hash: 1.2, bounds: 1.8 },
  },
};
