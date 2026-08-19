/**
 * Maps a normalised hash position (0..1) to a point in 2D, parameterised by how
 * far the hash space has been bent from a straight line into a closed ring.
 *
 * The rail always has a fixed arc length. At bend `t` it subtends `theta = t * TAU`,
 * so its radius is `length / theta`. As `theta` approaches zero the radius grows
 * without bound and the arc flattens into a line, which is why the straight case
 * falls out of the same formula rather than needing a separate code path.
 *
 * Because arc length is preserved for every `t`, two positions keep their spacing
 * along the rail throughout the morph. That is the property that lets keys stay
 * visually trackable while the line closes into a ring.
 *
 * Handedness: the rail is anchored at its midpoint (position 0.5) and curls
 * downward, placing the circle centre below the anchor. Given a line that reads
 * left-to-right at bend 0, that is the only curl direction that yields a
 * clockwise ring, which the lookup rule depends on. The consequence is that the
 * seam where 0 meets the maximum settles at the bottom of the ring rather than
 * the top; seam-at-top and clockwise are not simultaneously achievable while the
 * midpoint stays anchored.
 */

export const TAU = Math.PI * 2;

const STRAIGHT_THRESHOLD = 1e-6;

function isStraight(bend) {
  return bend * TAU < STRAIGHT_THRESHOLD;
}

export function getArcRadius({ bend, length }) {
  if (isStraight(bend)) return Infinity;
  return length / (bend * TAU);
}

/**
 * Centre of the circle the rail currently lies on, or null while it is straight.
 */
export function getArcCentre({ bend, length, anchorX, anchorY }) {
  if (isStraight(bend)) return null;
  return { x: anchorX, y: anchorY + getArcRadius({ bend, length }) };
}

/**
 * Vertical extent of the rail below its anchor, which a scene needs in order to
 * keep the shape optically centred while it bends.
 *
 * The lowest point of the arc is always at its endpoints, because |phi| only
 * reaches pi when the ring closes completely. So one expression covers every
 * bend, growing from zero when straight to the full diameter once closed.
 */
export function getArcHeight({ bend, length }) {
  if (isStraight(bend)) return 0;
  const radius = length / (bend * TAU);
  return radius * (1 - Math.cos(Math.PI * bend));
}

export function projectPosition({ position, bend, length, anchorX, anchorY }) {
  if (isStraight(bend)) {
    return {
      x: anchorX + (position - 0.5) * length,
      y: anchorY,
      phi: 0,
      normalX: 0,
      normalY: -1,
      tangentX: 1,
      tangentY: 0,
    };
  }

  const radius = length / (bend * TAU);
  const phi = (position - 0.5) * bend * TAU;
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);

  return {
    x: anchorX + radius * sinPhi,
    y: anchorY + radius * (1 - cosPhi),
    phi,
    normalX: sinPhi,
    normalY: -cosPhi,
    tangentX: cosPhi,
    tangentY: sinPhi,
  };
}

/**
 * A point offset perpendicular to the rail. Positive offsets sit above the line
 * while straight and outside the ring once bent, so annotations and ticks bend
 * coherently with the rail without any scene-specific trigonometry.
 */
export function projectOffset({ position, bend, length, anchorX, anchorY, offset }) {
  const point = projectPosition({ position, bend, length, anchorX, anchorY });

  return {
    x: point.x + point.normalX * offset,
    y: point.y + point.normalY * offset,
    phi: point.phi,
  };
}

/**
 * Angle in degrees for text or ticks that should stay perpendicular to the rail.
 * Zero while straight, so labels are unrotated in the number-line scene.
 */
export function getNormalRotation({ position, bend }) {
  if (isStraight(bend)) return 0;
  return ((position - 0.5) * bend * TAU * 180) / Math.PI;
}

/**
 * A point on a closed ring of a given radius, in the same handedness the morph
 * arrives at: position 0.5 at the top, increasing clockwise, the seam at the
 * bottom. Scenes that only ever draw a closed ring — the full-scale views — take
 * their geometry from here rather than re-deriving a circle, so every ring in the
 * story agrees about where a position is.
 */
export function ringPoint({ centreX, centreY, radius, position }) {
  const phi = (position - 0.5) * TAU;

  return {
    x: centreX + radius * Math.sin(phi),
    y: centreY - radius * Math.cos(phi),
    phi,
  };
}

/** Clockwise arc between two positions, as a single SVG arc command. */
export function ringArcPath({ centreX, centreY, radius, from, to }) {
  const start = ringPoint({ centreX, centreY, radius, position: from });
  const end = ringPoint({ centreX, centreY, radius, position: to });
  const largeArc = to - from > 0.5 ? 1 : 0;

  return [
    `M ${start.x.toFixed(2)} ${start.y.toFixed(2)}`,
    `A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`,
  ].join(' ');
}

export function buildArcPath({ bend, length, anchorX, anchorY, from = 0, to = 1, segments = 180 }) {
  const steps = Math.max(1, Math.round(segments));
  const commands = [];

  for (let step = 0; step <= steps; step++) {
    const position = from + ((to - from) * step) / steps;
    const { x, y } = projectPosition({ position, bend, length, anchorX, anchorY });
    commands.push(`${step === 0 ? 'M' : 'L'} ${x.toFixed(3)} ${y.toFixed(3)}`);
  }

  return commands.join(' ');
}
