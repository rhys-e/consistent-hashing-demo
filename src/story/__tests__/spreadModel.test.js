import { buildSpreadModel, SPREAD_LEVELS } from '../topology';
import { PLACED_SPREAD, POSITIONS_EACH } from '../placedRing';

const pct = value => Number((value * 100).toFixed(1));
const shareOf = (shares, id) => pct(shares.find(entry => entry.id === id).share);
const spreadOf = shares =>
  pct(Math.max(...shares.map(s => s.share)) - Math.min(...shares.map(s => s.share)));

describe('the spread model', () => {
  const model = buildSpreadModel(PLACED_SPREAD);
  const [sparse, dense] = model.levels;

  it('compares one position per server against six', () => {
    expect(SPREAD_LEVELS).toEqual([1, POSITIONS_EACH]);
    expect(sparse.before.topology.vnodes.length).toBe(3);
    expect(dense.before.topology.vnodes.length).toBe(18);
  });

  /**
   * The comparison is only fair if both levels start from the same balance. If the
   * dense one started more even, the scene would be showing two things at once and
   * a viewer could reasonably credit the wrong one.
   */
  it('starts from the same balance at both densities', () => {
    expect(spreadOf(sparse.before.shares)).toBeCloseTo(4.6, 1);
    expect(spreadOf(dense.before.shares)).toBeLessThan(6);
  });

  /**
   * Why six positions each is only available with the positions placed.
   *
   * Hashed, six is a bad ring: it starts sixteen points from even against the
   * sparse level's four and a half, so a viewer would have two changes to account
   * for rather than one, and it would credit the wrong one. Ten was the only count
   * from one to twelve that a hash left near even, which is why the scene was stuck
   * with thirty dots. Placing the positions is what makes the count a free choice.
   */
  it('is a comparison only because the positions are placed', () => {
    const [, hashed] = buildSpreadModel().levels;

    expect(spreadOf(hashed.before.shares)).toBeGreaterThan(15);
    expect(spreadOf(dense.before.shares)).toBeLessThan(6);
  });

  /** The claim, as data: one neighbour takes everything, or two take half each. */
  it('concentrates the failure at one position and splits it at six', () => {
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
  it('breaks the lost range into more pieces at six', () => {
    expect(sparse.remap.ranges.length).toBe(2);
    expect(dense.remap.ranges.length).toBeGreaterThanOrEqual(5);
  });

  /** The frame the scene ends on, against the one Scene 3 ended on. */
  it('leaves the survivors near even at six and lopsided at one', () => {
    expect(shareOf(sparse.after.shares, 'cache-3')).toBe(64.3);
    expect(shareOf(sparse.after.shares, 'cache-5')).toBe(35.7);

    const after = [shareOf(dense.after.shares, 'cache-3'), shareOf(dense.after.shares, 'cache-5')];
    expect(Math.abs(after[0] - after[1])).toBeLessThan(6);
    expect(after[0] + after[1]).toBeCloseTo(100, 0);
  });

  /**
   * Adding positions only ever adds: `#0` is where it was at either density, so the
   * denser ring genuinely contains the sparse one rather than replacing it. It is
   * also what keeps Scene 4 opening on Scene 3's frame — the three anchors are real
   * hashes, and only the positions added around them are placed.
   */
  it('keeps the first position of each server at both densities', () => {
    sparse.before.topology.vnodes.forEach(vnode => {
      const same = dense.before.topology.vnodes.find(entry => entry.vnodeId === vnode.vnodeId);
      expect(same.position).toBe(vnode.position);
    });
  });
});
