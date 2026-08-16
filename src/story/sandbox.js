import theme from '../themes';
import { buildTopology, ownershipShares, remapDelta } from './ringModel';

/**
 * The story's claims, with the numbers unlocked.
 *
 * Every control here answers a question the story raised and then answered with
 * one example: how much moves when a server leaves, and what more positions per
 * server does to that. So the model is deliberately small — a server count, a
 * position count, and the topology those two produce — because anything else
 * would be a feature the story never earned.
 *
 * It is a pure function of its inputs and keeps the previous inputs beside them,
 * because the interesting number is not the state but the *difference*: what
 * fraction of the ring changed hands as a result of the last thing you did.
 */

/**
 * As many servers as there are colours that survive being drawn as hairlines
 * next to each other. Distinguishability is the real limit on this scene, not
 * anything about hashing.
 */
export const SANDBOX_SERVERS = [
  { id: 'cache-01', color: theme.colors.primary.neoRed },
  { id: 'cache-02', color: theme.colors.primary.cyberBlue },
  { id: 'cache-03', color: theme.colors.primary.matrixGreen },
  { id: 'cache-04', color: theme.colors.primary.neonOrange },
  { id: 'cache-05', color: theme.colors.primary.synthwavePurple },
  { id: 'cache-06', color: theme.colors.primary.chromeSilver },
  { id: 'cache-07', color: theme.colors.primary.virtualGold },
  { id: 'cache-08', color: theme.colors.primary.digitalLime },
];

/**
 * Steps rather than a slider, because what matters is the *order of magnitude*
 * and the interesting part is between 1 and 50. A linear slider spends most of
 * its travel in the region where nothing further happens.
 */
export const POSITION_STEPS = [1, 3, 10, 50, 150, 500];

export const SANDBOX_LIMITS = {
  minServers: 2,
  maxServers: SANDBOX_SERVERS.length,
};

export const INITIAL_SANDBOX = {
  serverCount: 6,
  /** Where the story left off, so the sandbox opens on the ring it ended with. */
  vnodesPerServer: 150,
};

const clampServers = count =>
  Math.min(SANDBOX_LIMITS.maxServers, Math.max(SANDBOX_LIMITS.minServers, count));

/**
 * A change, and what it was a change *from*.
 *
 * The previous inputs are carried rather than the previous topology: rebuilding
 * is cheap and deterministic, and holding a topology would mean two versions of
 * the truth to keep in step.
 */
export function sandboxReducer(state, action) {
  const from = { serverCount: state.serverCount, vnodesPerServer: state.vnodesPerServer };

  switch (action.type) {
    case 'ADD_SERVER':
      return { ...from, serverCount: clampServers(from.serverCount + 1), from };
    case 'DROP_SERVER':
      return { ...from, serverCount: clampServers(from.serverCount - 1), from };
    case 'SET_POSITIONS':
      return { ...from, vnodesPerServer: action.value, from };
    case 'RESET':
      return { ...INITIAL_SANDBOX, from };
    default:
      return state;
  }
}

export const initialSandbox = () => ({ ...INITIAL_SANDBOX, from: null });

const topologyFor = ({ serverCount, vnodesPerServer }) =>
  buildTopology({
    servers: SANDBOX_SERVERS.slice(0, serverCount),
    vnodesPerServer,
  });

/**
 * What the same change would have cost with plain modulo.
 *
 * This is the comparison the whole story is against, and until now it was made
 * once in the opening slide and never again. A key stays where it is only when
 * `k mod n` equals `k mod m`, which happens for `min(n, m)` values out of every
 * `n * m` — so the fraction that moves is exact, not sampled.
 *
 * It is the number that says what consistent hashing is *for*. Moving 13% where
 * the obvious method moves 86% is the entire return.
 */
export function moduloCost(fromServers, toServers) {
  if (fromServers === toServers) return 0;
  return 1 - Math.min(fromServers, toServers) / (fromServers * toServers);
}

function snapshotOf(inputs) {
  const topology = topologyFor(inputs);

  return {
    topology,
    shares: ownershipShares(topology),
    servers: SANDBOX_SERVERS.slice(0, inputs.serverCount),
  };
}

export function buildSandbox(state) {
  const servers = SANDBOX_SERVERS.slice(0, state.serverCount);
  const topology = topologyFor(state);
  const shares = ownershipShares(topology);

  return {
    servers,
    topology,
    shares,
    evenShare: 1 / servers.length,
    /**
     * What it cost to add or remove a server, and only that.
     *
     * Changing how many positions each server holds also moves keys, and
     * reporting it under the same heading made one number answer two questions —
     * a reader could not tell whether 31% was the price of a server leaving or
     * the price of turning a dial. The density is a setting; the roster change is
     * the event. Only the event is costed.
     *
     * A viewer who wants to know how density affects the cost sets the density
     * first and then adds a server, which is the comparison they were reaching
     * for anyway.
     */
    change:
      state.from && state.from.serverCount !== state.serverCount
        ? {
            ...remapDelta(topologyFor(state.from), topology),
            from: state.from,
            modulo: moduloCost(state.from.serverCount, state.serverCount),
            gained: state.serverCount > state.from.serverCount,
          }
        : null,
    /**
     * What it looked like a moment ago, so bars can settle rather than jump and
     * the old ownership can dissolve into the new one. Two topologies cannot be
     * tweened — changing the position count changes every boundary — so the only
     * honest transition between them is a crossfade, and that needs both.
     */
    previous: state.from ? snapshotOf(state.from) : null,
  };
}
