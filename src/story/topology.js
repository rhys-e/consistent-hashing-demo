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
  { id: 'cache-06', color: theme.colors.primary.tealHologram },
];

export const JOINING_SERVER = { id: 'cache-07', color: theme.colors.primary.virtualGold };

/**
 * Scene 6 and Scene 7 are the same picture with one more server in it, so they
 * are built together: the remap is the difference between the two topologies
 * rather than something the scene decorates on top of one.
 */
export function buildFullScaleModel({ serverCount = 6, vnodesPerServer = 150, joined = false }) {
  const servers = SAMPLE_SERVERS.slice(0, serverCount);
  const before = buildTopology({ servers, vnodesPerServer });

  if (!joined) {
    return { topology: before, shares: ownershipShares(before), remap: null };
  }

  const after = buildTopology({
    servers: [...servers, JOINING_SERVER],
    vnodesPerServer,
  });

  return {
    topology: after,
    shares: ownershipShares(after),
    remap: { ...remapDelta(before, after), serverId: JOINING_SERVER.id },
  };
}

export function colorsById(servers) {
  return new Map(servers.map(server => [server.id, server.color]));
}
