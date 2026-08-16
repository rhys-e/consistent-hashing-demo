import theme from '../themes';
import { buildTopology, ownershipShares } from './ringModel';
import { REMOVAL_SERVERS, DEPARTING_SERVER_ID, SAMPLE_SERVERS } from './topology';
import { POSITIONS_EACH, placedPositionFor } from './placedRing';

/**
 * The bridge between Scene 4 and production scale.
 *
 * The story currently cuts from a ring of thirty countable positions to a ring of
 * nine hundred, and says the difference in a sentence on a narration slide. The
 * viewer is asked to accept that the second picture is the first one with more of
 * it, which is exactly the thing the story otherwise refuses to assert.
 *
 * It can be shown instead, and the reason it can is a property of the model rather
 * than a trick of the drawing:
 *
 * > A server's positions are `hash(id#0) … hash(id#n-1)`. Raising `n` appends. It
 * > never moves a position the server already had.
 *
 * So going from ten positions each to a hundred and fifty does not rearrange the
 * ring. Every boundary the viewer has been looking at is still exactly where it
 * was, and a hundred and forty more appear *between* them. That is the same claim
 * the whole story is about — adding capacity does not move what is already there —
 * arriving one scene before the viewer is asked to believe it at scale.
 *
 * `densityRamp.test.js` asserts it, because it is a property of the hash and the
 * bridge is worthless without it.
 */

/**
 * Six is where Scene 4 leaves the viewer, and a hundred and fifty is what Scenes 5
 * to 7 are drawn at, so the ends are fixed. Thirty is the one step between them.
 *
 * One step rather than four, because each is a crossfade of ownership and a
 * sequence of dissolves reads as a slideshow of unrelated rings. Thirty is also
 * where the mark notation stops working — a little over half its boundaries land
 * within three pixels of the one before, so it is the last level at which a viewer
 * could still be counting, and the right place to stop asking them to.
 */
export const RAMP_LEVELS = [POSITIONS_EACH, 30, 150];

/**
 * The cast for the carry-over treatment.
 *
 * The two survivors of Scene 3 and 4 keep their real ids, so their positions are
 * *the same positions* — the green and purple marks stay where the previous scene
 * left them rather than merely looking similar.
 *
 * The four arrivals are a known compromise. `virtualGold` belongs to Scene 7's
 * joining server, so using it here spends a colour the story wants later; the
 * alternatives are worse, because `digitalLime` and `matrixGreen` are the same
 * hex in the cyber theme and `tealHologram` is the colour `SAMPLE_SERVERS` already
 * rejects for sitting next to green at hairline widths. Worth settling if this
 * treatment is the one chosen.
 */
export const CARRY_OVER_SURVIVORS = REMOVAL_SERVERS.filter(
  server => server.id !== DEPARTING_SERVER_ID
);

export const CARRY_OVER_ARRIVALS = [
  { id: 'cache-01', color: theme.colors.primary.neoRed },
  { id: 'cache-02', color: theme.colors.primary.cyberBlue },
  { id: 'cache-06', color: theme.colors.primary.chromeSilver },
  { id: 'cache-07', color: theme.colors.primary.virtualGold },
];

export const CARRY_OVER_CAST = [...CARRY_OVER_SURVIVORS, ...CARRY_OVER_ARRIVALS];

export const SAMPLE_CAST = SAMPLE_SERVERS.slice(0, 6);

/** Which of a server's positions this is, out of `vnodeId` — `cache-01#37` is 37. */
export const vnodeIndex = vnodeId => Number(vnodeId.slice(vnodeId.indexOf('#') + 1));

/**
 * The largest single range on the ring.
 *
 * This is the bridge's headline number, and it was chosen over spread — the
 * distance between the largest and smallest share — after measuring both. Spread
 * is not monotonic in the position count at these sample sizes: six servers are at
 * 14.8 points at ten positions each, 3.0 at thirty and 5.9 at a hundred and fifty,
 * so a scene that put it on screen at every level would show the fix getting worse
 * halfway through and would be telling the truth. That is the same trap the plan's
 * 1/3/8 stepper fell into in Scene 4.
 *
 * The biggest piece falls monotonically and by a lot — 7.3% to 0.7% over the same
 * range — and it is also the number that matters. What makes a failure spread out
 * is that no single range is large enough to hurt when it moves.
 */
export const biggestPiece = topology =>
  topology.ranges.reduce((most, range) => Math.max(most, range.to - range.from), 0);

/**
 * How many different servers own a piece of the widest gap-free stretch of ring a
 * viewer might point at. The claim Scene 5 makes, as a number the bridge can move.
 */
export function serversInWindow(topology, from, width) {
  const inside = topology.ranges.filter(range => range.to > from && range.from < from + width);
  return new Set(inside.map(range => range.serverId)).size;
}

function levelOf(servers, vnodesPerServer, positionFor) {
  const topology = buildTopology({ servers, vnodesPerServer, positionFor });

  return {
    vnodesPerServer,
    topology,
    shares: ownershipShares(topology),
    biggest: biggestPiece(topology),
    rangeCount: topology.ranges.length,
    /** One entry per server, because ownership is drawn as one dashed circle each. */
    byServer: servers.map(server => ({
      ...server,
      ranges: topology.ranges.filter(range => range.serverId === server.id),
    })),
  };
}

export function buildDensityRampModel({
  servers = SAMPLE_CAST,
  levels = RAMP_LEVELS,
  opensWith = null,
  positionFor,
} = {}) {
  const built = levels.map(count => levelOf(servers, count, positionFor));
  const densest = built[built.length - 1];

  /**
   * The positions that arrive at each level, taken from the densest topology.
   *
   * Grouping them this way rather than diffing consecutive topologies is what
   * makes the nesting visible in the code as well as true in the data: a mark
   * belongs to exactly one tranche, is drawn once, and never moves. A tranche
   * fades in and stays.
   */
  const tranches = levels.map((count, index) => {
    const arrivesAfter = index === 0 ? 0 : levels[index - 1];

    return densest.topology.vnodes.filter(vnode => {
      const position = vnodeIndex(vnode.vnodeId);
      return position >= arrivesAfter && position < count;
    });
  });

  /**
   * The ring before the ramp starts, where a treatment opens on fewer servers than
   * it ends with.
   *
   * It is a whole level of its own rather than a subset of the first one, because a
   * ring shared by two servers is not the six-server ring with four of them hidden
   * — the two survivors own everything, and their arcs run right round to each
   * other. Drawing it any other way would put ownership on screen that belongs to
   * servers the viewer has not been shown.
   */
  const prelude = opensWith ? levelOf(opensWith, levels[0], positionFor) : null;

  return {
    servers,
    levels: built,
    tranches,
    prelude,
    /** Who is not on the ring when it opens, in the order they arrive. */
    arrivals: opensWith
      ? servers.filter(server => !opensWith.some(early => early.id === server.id))
      : [],
    opensWith: opensWith ?? servers,
    evenShare: 1 / servers.length,
    colorOf: id => servers.find(server => server.id === id)?.color,
  };
}

export const RAMP_MODEL = buildDensityRampModel();

/**
 * The multiply treatment's cast: the three servers of Scenes 2, 3 and 4, at the
 * density Scene 4 gets them to.
 *
 * It opens on the exact frame Scene 4 shows before the failure — same ids, so the
 * same hashes, so the same thirty marks in the same thirty places. That is the
 * strongest continuity available anywhere in this bridge, and it is bought by
 * rewinding the failure, which the narration slide between them has to absorb. The
 * deck has done that once already: `Story.jsx` puts a slide between Scenes 3 and 4
 * for exactly this reason, because Scene 4 puts the failed server back too.
 *
 * What it does not fix is the roster. Three servers at production density hands on
 * to six, and the cut moves rather than disappearing — though it moves to the place
 * it does least damage, since at this density no individual is followable anyway.
 */
export const MULTIPLY_MODEL = buildDensityRampModel({
  servers: REMOVAL_SERVERS,
  // Scene 4's first ten positions per server are placed rather than hashed, so the
  // bridge has to open on those or its whole point — that nothing already on the
  // ring moves — is false at the first frame. Beyond the tenth the table falls
  // through to the hash, which is exactly what the bridge is adding.
  positionFor: placedPositionFor,
});
export const CARRY_OVER_MODEL = buildDensityRampModel({
  servers: CARRY_OVER_CAST,
  opensWith: CARRY_OVER_SURVIVORS,
});
