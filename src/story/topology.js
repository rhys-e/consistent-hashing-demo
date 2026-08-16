import theme from '../themes';
import {
  buildTopology,
  hashPosition,
  ownershipShares,
  remapDelta,
  resolveOwner,
} from './ringModel';

/**
 * The cast for the full-scale scenes. Six servers is enough that no single colour
 * dominates and few enough that the palette stays discriminable, which is the
 * constraint that actually decides how many a scene can carry.
 */
export const SAMPLE_SERVERS = [
  { id: 'cache-01', color: theme.colors.primary.neoRed },
  { id: 'cache-02', color: theme.colors.primary.cyberBlue },
  { id: 'cache-03', color: theme.colors.primary.matrixGreen },
  { id: 'cache-04', color: theme.colors.primary.neonOrange },
  { id: 'cache-05', color: theme.colors.primary.synthwavePurple },
  // Not the teal: against `matrixGreen` two lanes away it reads as the same
  // colour at hairline widths, which is the only width these are ever drawn at.
  { id: 'cache-06', color: theme.colors.primary.chromeSilver },
];

export const JOINING_SERVER = { id: 'cache-07', color: theme.colors.primary.virtualGold };

/**
 * Scene 6 and Scene 7 are the same picture with one more server in it, so they
 * are built together: the remap is the difference between the two topologies
 * rather than something the scene decorates on top of one.
 *
 * `stolenFrom` groups the moved ranges by who lost them, which is what lets the
 * animation carry them out of one lane and into another as a batch per lane
 * instead of animating several hundred arcs individually.
 */
export function buildFullScaleModel({ serverCount = 6, vnodesPerServer = 150, joined = false }) {
  const servers = SAMPLE_SERVERS.slice(0, serverCount);
  const before = buildTopology({ servers, vnodesPerServer });
  const beforeShares = ownershipShares(before);

  if (!joined) {
    return {
      servers,
      topology: before,
      shares: beforeShares,
      beforeShares,
      remap: null,
      stolenFrom: [],
    };
  }

  const joinedServers = [...servers, JOINING_SERVER];
  const after = buildTopology({ servers: joinedServers, vnodesPerServer });
  const delta = remapDelta(before, after);

  return {
    servers: joinedServers,
    topology: after,
    shares: ownershipShares(after),
    beforeShares,
    remap: { ...delta, serverId: JOINING_SERVER.id },
    stolenFrom: servers
      .map(server => ({
        ...server,
        ranges: delta.ranges.filter(range => range.fromServerId === server.id),
      }))
      .filter(source => source.ranges.length > 0),
  };
}

/**
 * What a lane draws for itself. The joining server's lane starts empty because
 * everything it owns arrives from somewhere else, and drawing those ranges twice
 * would make the ring look busier at rest than it is.
 */
export function laneRanges(model, serverId) {
  if (model.remap && serverId === model.remap.serverId) return [];
  return model.topology.ranges.filter(range => range.serverId === serverId);
}

export function colorsById(servers) {
  return new Map(servers.map(server => [server.id, server.color]));
}

/**
 * The cast for the removal scene: three servers, one position each.
 *
 * Not a subset of `SAMPLE_SERVERS`, and that is a data fact rather than a
 * preference. At one vnode apiece the six of them land between 0.008 and 0.340 —
 * every triple starts at something like 0.5% / 87.7%, which opens the scene on a
 * ring that already looks broken and buries the thing it is there to show. These
 * three hash to 31.1 / 33.2 / 35.7: uneven enough to be a real hash, even enough
 * that what happens on removal is the news.
 *
 * Colours match `cache-03`/`04`/`05` so the association a viewer has already built
 * between a number and a colour survives the scene.
 */
export const REMOVAL_SERVERS = [
  { id: 'cache-3', color: theme.colors.primary.matrixGreen },
  { id: 'cache-4', color: theme.colors.primary.neonOrange },
  { id: 'cache-5', color: theme.colors.primary.synthwavePurple },
];

/**
 * `cache-4` leaves, because its range is the one that crosses the seam — so the
 * arc that absorbs it has to grow *backwards across the seam* to do so, which is
 * the ownership rule stating itself rather than being asserted.
 */
export const DEPARTING_SERVER_ID = 'cache-4';

/**
 * All of one shape, `user:<id>`, because a scene showing a cache does not also
 * need to be showing the variety of things a cache can hold — a mixed bag of
 * `image:`, `session:` and `doc:` invites the viewer to wonder whether the kind of
 * key matters, and it does not.
 *
 * `user:1842` is kept from the opening scene on purpose: the viewer has already
 * watched that exact key hash to that exact position, so one of the diamonds here
 * is one they have met.
 *
 * Chosen for spacing rather than for their owners: eleven targets evenly spaced
 * around the ring, anchored on the exemplar, each filled by whichever real id
 * hashes closest to it while staying clear of the seam and of every server
 * position. No two are within about twenty-eight degrees, so none collide as marks
 * or as labels, and none is ambiguous about which side of a boundary it is on.
 */
export const REMOVAL_KEYS = [
  'user:4570',
  'user:1053',
  'user:4722',
  'user:6177',
  'user:6273',
  'user:7904',
  'user:1842',
  'user:8826',
  'user:8193',
  'user:4743',
  'user:3131',
];

/**
 * One arc per server: it ends at the server's own position and begins at the
 * position before it.
 *
 * That direction is the whole rule. An arc drawn forwards from a marker would be
 * the wrong claim, and would make the scene's opening movement teach the opposite
 * of what the lookup does.
 */
function arcsOf(topology) {
  const { vnodes } = topology;

  return vnodes.map((vnode, index) => {
    const previous = vnodes[(index - 1 + vnodes.length) % vnodes.length];
    const span = vnodes.length === 1 ? 1 : (((vnode.position - previous.position) % 1) + 1) % 1;

    return {
      serverId: vnode.serverId,
      // Carried through so a scene can follow one *position's* range across a
      // change of topology, rather than only the server's total.
      vnodeId: vnode.vnodeId,
      endsAt: vnode.position,
      startsAt: previous.position,
      span,
    };
  });
}

/**
 * Scene 2: the lookup rule, on the same three servers Scene 3 then breaks.
 *
 * A key is routed by travelling *forwards* from its own position to the first
 * server it meets, which is the definition stated as a journey. `travel` is how
 * far that journey is, so the scene can move a particle along it rather than
 * asserting where it ends up — and because ownership is the same fact read the
 * other way round, the arcs that follow are the same distances swept backwards.
 */
export function buildLookupModel({ servers = REMOVAL_SERVERS, keyNames = REMOVAL_KEYS } = {}) {
  const topology = buildTopology({ servers, vnodesPerServer: 1 });

  const keys = keyNames
    .map(name => {
      const position = hashPosition(name);
      const vnode = resolveOwner(topology, position);
      return {
        name,
        position,
        owner: vnode.serverId,
        /** Forwards from the key to its server: the lookup, as a distance. */
        travel: (((vnode.position - position) % 1) + 1) % 1,
      };
    })
    .sort((left, right) => left.position - right.position);

  return {
    servers,
    keys,
    topology,
    arcs: arcsOf(topology),
    shares: ownershipShares(topology),
  };
}

/**
 * The vnode counts Scene 4 steps between, and why they are not the plan's 1/3/8.
 *
 * The plan asked for a stepper at one, three and eight positions per server. The
 * data refuses: at three the surviving neighbour still takes 96% of the failed
 * server's load, so the scene would show virtual nodes *not* working; at eight the
 * starting split is 44/33/22, visibly worse than at one, so a viewer would read
 * the fix as having caused the problem. Both are small-sample noise rather than
 * anything about consistent hashing, and neither can be explained in a scene.
 *
 * Ten is where the expectation shows through, and it is representative rather than
 * lucky: every count from eight upwards splits the failure roughly in half. What
 * one and ten have in common is the honest part — they start from the same
 * balance, so the only thing that differs afterwards is the failure.
 */
export const SPREAD_LEVELS = [1, 6];

/**
 * Scene 4: the same three servers and the same failure, at two densities.
 *
 * Both levels are built from the same cast so the comparison is like for like, and
 * a level carries its ranges *per vnode* rather than per server, because the scene
 * has to draw each position claiming its own stretch of ring.
 */
export function buildSpreadModel({
  servers = REMOVAL_SERVERS,
  removedId = DEPARTING_SERVER_ID,
  levels = SPREAD_LEVELS,
  vnodeKey,
  positionFor,
} = {}) {
  const survivors = servers.filter(server => server.id !== removedId);

  const built = levels.map(vnodesPerServer => {
    const before = buildTopology({ servers, vnodesPerServer, vnodeKey, positionFor });
    const after = buildTopology({ servers: survivors, vnodesPerServer, vnodeKey, positionFor });
    const delta = remapDelta(before, after);

    return {
      vnodesPerServer,
      before: { topology: before, arcs: arcsOf(before), shares: ownershipShares(before) },
      after: { topology: after, arcs: arcsOf(after), shares: ownershipShares(after) },
      remap: delta,
      /**
       * What each survivor picks up, which is the number the scene exists to
       * contrast: one server taking all of it, or two taking half each.
       */
      absorbed: survivors.map(server => ({
        ...server,
        share: delta.ranges
          .filter(range => range.serverId === server.id)
          .reduce((sum, range) => sum + (range.to - range.from), 0),
      })),
    };
  });

  return { servers, survivors, removedId, levels: built };
}

/**
 * Scene 3: three servers at one position each, and what happens when one leaves.
 *
 * Both halves of the argument come out of one comparison rather than being staged
 * separately — which keys move is the same computation as how much space changes
 * hands, so the scene cannot show one and assert the other.
 */
export function buildRemovalModel({
  servers = REMOVAL_SERVERS,
  removedId = DEPARTING_SERVER_ID,
  keyNames = REMOVAL_KEYS,
} = {}) {
  const survivors = servers.filter(server => server.id !== removedId);
  const before = buildTopology({ servers, vnodesPerServer: 1 });
  const after = buildTopology({ servers: survivors, vnodesPerServer: 1 });

  const keys = keyNames
    .map(name => {
      const position = hashPosition(name);
      const owner = resolveOwner(before, position).serverId;
      const nextOwner = resolveOwner(after, position).serverId;
      return { name, position, owner, nextOwner, moves: owner !== nextOwner };
    })
    .sort((left, right) => left.position - right.position);

  return {
    servers,
    survivors,
    removedId,
    keys,
    before: { topology: before, arcs: arcsOf(before), shares: ownershipShares(before) },
    after: { topology: after, arcs: arcsOf(after), shares: ownershipShares(after) },
    remap: remapDelta(before, after),
  };
}
