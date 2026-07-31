import theme from '../themes';
import { buildTopology, ownershipShares, remapDelta } from './ringModel';

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
