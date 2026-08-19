import { buildTopology } from '../ringModel';
import {
  biggestPiece,
  buildDensityRampModel,
  CARRY_OVER_CAST,
  CARRY_OVER_SURVIVORS,
  RAMP_LEVELS,
  RAMP_MODEL,
  SAMPLE_CAST,
  serversInWindow,
  vnodeIndex,
} from '../densityRamp';

const positionsOf = (servers, vnodesPerServer) => {
  const map = new Map();
  buildTopology({ servers, vnodesPerServer }).vnodes.forEach(vnode =>
    map.set(vnode.vnodeId, vnode.position)
  );
  return map;
};

describe('the density bridge', () => {
  /**
   * The property the whole treatment rests on. A position is `hash(id#index)`, so
   * raising the count appends and never rearranges — which is what lets the ramp
   * be shown as boundaries arriving between the ones already there, rather than as
   * one ring dissolving into an unrelated one.
   *
   * If this ever fails, the bridge is not merely less pretty, it is a lie.
   */
  it('never moves a position that a server already had', () => {
    const sparse = positionsOf(SAMPLE_CAST, RAMP_LEVELS[0]);
    const dense = positionsOf(SAMPLE_CAST, RAMP_LEVELS.at(-1));

    expect(sparse.size).toBe(SAMPLE_CAST.length * RAMP_LEVELS[0]);
    sparse.forEach((position, vnodeId) => {
      expect(dense.get(vnodeId)).toBe(position);
    });
  });

  it('adds every new position between the ones already on the ring', () => {
    const { tranches } = RAMP_MODEL;
    const seen = new Set();

    tranches.forEach(tranche => {
      tranche.forEach(vnode => {
        expect(seen.has(vnode.vnodeId)).toBe(false);
        seen.add(vnode.vnodeId);
      });
    });

    // Every position of the densest level, in exactly one tranche.
    expect(seen.size).toBe(SAMPLE_CAST.length * RAMP_LEVELS.at(-1));
    expect(tranches.map(tranche => tranche.length)).toEqual([36, 144, 720]);
  });

  /**
   * The headline number has to fall at every step, or the scene shows its own
   * argument failing halfway through. Spread does exactly that at these sample
   * sizes, which is why it is not the number on screen.
   */
  it('shrinks the biggest piece at every level', () => {
    const biggest = RAMP_MODEL.levels.map(level => level.biggest);

    biggest.forEach((value, index) => {
      if (index === 0) return;
      expect(value).toBeLessThan(biggest[index - 1]);
    });

    expect(biggest[0]).toBeGreaterThan(0.05);
    expect(biggest.at(-1)).toBeLessThan(0.01);
  });

  /** Recorded so the choice is checkable rather than remembered. */
  it('is why spread is not the number on screen', () => {
    const spread = shares =>
      Math.max(...shares.map(entry => entry.share)) - Math.min(...shares.map(entry => entry.share));
    const spreads = RAMP_MODEL.levels.map(level => spread(level.shares));

    expect(spreads.at(-1)).toBeLessThan(spreads[0]);
    // And yet not monotone: the middle level is tighter than the densest one.
    expect(spreads[1]).toBeLessThan(spreads.at(-1));
  });

  /** What the following scene claims, arriving as something the bridge moves. */
  it('puts more servers into the same small section as it goes', () => {
    const counts = RAMP_MODEL.levels.map(level => serversInWindow(level.topology, 0.4, 0.02));

    expect(counts[0]).toBeLessThan(counts.at(-1));
    expect(counts.at(-1)).toBeGreaterThanOrEqual(4);
  });

  /**
   * The carry-over treatment is only worth anything if the two survivors keep the
   * positions Scene 4 left them on. Same ids, same hashes, same marks.
   */
  it('keeps the survivors of Scene 4 exactly where Scene 4 left them', () => {
    const beforeBridge = positionsOf(CARRY_OVER_SURVIVORS, 10);
    const duringBridge = positionsOf(CARRY_OVER_CAST, 10);

    expect(beforeBridge.size).toBe(20);
    beforeBridge.forEach((position, vnodeId) => {
      expect(duringBridge.get(vnodeId)).toBe(position);
    });
  });

  it('reads a position index out of its id', () => {
    expect(vnodeIndex('cache-01#0')).toBe(0);
    expect(vnodeIndex('cache-01#149')).toBe(149);
  });

  it('measures the biggest piece as a fraction of the ring', () => {
    const topology = buildTopology({ servers: SAMPLE_CAST, vnodesPerServer: 1 });
    expect(biggestPiece(topology)).toBeCloseTo(0.6597, 3);
  });

  it('builds a level for every count it is given', () => {
    const model = buildDensityRampModel({ levels: [5, 500] });

    expect(model.levels.map(level => level.vnodesPerServer)).toEqual([5, 500]);
    expect(model.levels[1].rangeCount).toBe(6 * 500 + 1);
  });
});
