import { buildSpreadModel, SPREAD_LEVELS } from '../topology';

const pct = value => Number((value * 100).toFixed(1));
const shareOf = (shares, id) => pct(shares.find(entry => entry.id === id).share);

describe('the spread model', () => {
  const model = buildSpreadModel();
  const [sparse, dense] = model.levels;

  it('compares one position per server against ten', () => {
    expect(SPREAD_LEVELS).toEqual([1, 10]);
    expect(sparse.before.topology.vnodes.length).toBe(3);
    expect(dense.before.topology.vnodes.length).toBe(30);
  });

  /**
   * The comparison is only fair if both levels start from the same balance. If
   * the dense one started more even, the scene would be showing two things at
   * once and a viewer could reasonably credit the wrong one.
   */
  it('starts from the same balance at both densities', () => {
    const spread = shares =>
      pct(Math.max(...shares.map(s => s.share)) - Math.min(...shares.map(s => s.share)));

    expect(spread(sparse.before.shares)).toBeCloseTo(4.6, 1);
    expect(spread(dense.before.shares)).toBeCloseTo(4, 1);
  });

  /** The claim, as data: one neighbour takes everything, or two take half each. */
  it('concentrates the failure at one position and splits it at ten', () => {
    const takers = level => level.absorbed.filter(entry => entry.share > 0.001);
    const biggest = level =>
      pct(Math.max(...level.absorbed.map(entry => entry.share)) / level.remap.fraction);

    expect(takers(sparse).length).toBe(1);
    expect(biggest(sparse)).toBe(100);

    expect(takers(dense).length).toBe(2);
    // Neither survivor takes appreciably more than half of what was lost.
    expect(biggest(dense)).toBeLessThan(55);
  });

  /** Scattered, not merely shared: the ranges themselves come apart. */
  it('breaks the lost range into more pieces at ten', () => {
    expect(sparse.remap.ranges.length).toBe(2);
    expect(dense.remap.ranges.length).toBeGreaterThan(5);
  });

  /** The frame the scene ends on, against the one Scene 3 ended on. */
  it('leaves the survivors near even at ten and lopsided at one', () => {
    expect(shareOf(sparse.after.shares, 'cache-3')).toBe(64.3);
    expect(shareOf(sparse.after.shares, 'cache-5')).toBe(35.7);

    expect(shareOf(dense.after.shares, 'cache-3')).toBe(51.5);
    expect(shareOf(dense.after.shares, 'cache-5')).toBe(48.5);
  });

  /**
   * Adding positions only ever adds: `#0` is where it was at either density, so
   * the denser ring genuinely contains the sparse one rather than replacing it.
   * The scene animates the split on that basis.
   */
  it('keeps the first position of each server at both densities', () => {
    sparse.before.topology.vnodes.forEach(vnode => {
      const same = dense.before.topology.vnodes.find(entry => entry.vnodeId === vnode.vnodeId);
      expect(same.position).toBe(vnode.position);
    });
  });
});
