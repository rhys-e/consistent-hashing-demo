import { buildRemovalModel, REMOVAL_SERVERS, DEPARTING_SERVER_ID } from '../topology';

const pct = value => Number((value * 100).toFixed(1));
const shareOf = (shares, id) => pct(shares.find(entry => entry.id === id).share);

describe('the removal model', () => {
  const model = buildRemovalModel();

  /**
   * Pinned, because the scene's whole argument is these numbers and they come out
   * of a hash — a change to `hashPosition` that leaves every other test green
   * would silently turn the scene into a different, weaker claim.
   */
  it('starts on a split that looks like a fair one', () => {
    expect(shareOf(model.before.shares, 'cache-3')).toBe(31.1);
    expect(shareOf(model.before.shares, 'cache-4')).toBe(33.2);
    expect(shareOf(model.before.shares, 'cache-5')).toBe(35.7);
  });

  /** The problem half: one neighbour absorbs all of it and roughly doubles. */
  it('lands the whole of the departing share on a single neighbour', () => {
    expect(shareOf(model.after.shares, 'cache-3')).toBe(64.3);
    expect(pct(model.remap.fraction)).toBe(33.2);
    expect(model.remap.ranges.every(range => range.serverId === 'cache-3')).toBe(true);
  });

  /** The payoff half, and the one a viewer is meant to leave with. */
  it('leaves every other server exactly where it was', () => {
    expect(shareOf(model.after.shares, 'cache-5')).toBe(shareOf(model.before.shares, 'cache-5'));
  });

  it('moves only the departing server keys', () => {
    const moved = model.keys.filter(key => key.moves);

    expect(moved.length).toBe(4);
    expect(moved.every(key => key.owner === DEPARTING_SERVER_ID)).toBe(true);
    expect(moved.every(key => key.nextOwner === 'cache-3')).toBe(true);
    // Every key the departing server owned moves, not merely some of them.
    expect(model.keys.filter(key => key.owner === DEPARTING_SERVER_ID).length).toBe(4);
  });

  /** Far enough apart to read as separate dots rather than a smudge. */
  it('spaces the keys around the ring', () => {
    model.keys.forEach((key, index) => {
      const next = model.keys[(index + 1) % model.keys.length];
      const gap = (((next.position - key.position) % 1) + 1) % 1;
      expect(gap).toBeGreaterThan(0.05);
    });
  });

  /**
   * An arc ends at its own server and begins at the one before it. Drawn the other
   * way round the scene's opening movement would teach the opposite of the lookup.
   */
  it('gives each server the arc ending at its own position', () => {
    model.before.arcs.forEach(arc => {
      const vnode = model.before.topology.vnodes.find(entry => entry.serverId === arc.serverId);
      expect(arc.endsAt).toBe(vnode.position);
      expect(pct(arc.span)).toBe(shareOf(model.before.shares, arc.serverId));
    });
  });

  /** The absorbing arc grows backwards across the seam, which is why it is the one. */
  it('absorbs across the seam', () => {
    const absorbing = model.after.arcs.find(arc => arc.serverId === 'cache-3');

    expect(absorbing.startsAt).toBeGreaterThan(absorbing.endsAt);
  });

  it('names three servers, one of which leaves', () => {
    expect(REMOVAL_SERVERS.map(server => server.id)).toEqual(['cache-3', 'cache-4', 'cache-5']);
    expect(model.survivors.map(server => server.id)).toEqual(['cache-3', 'cache-5']);
  });
});
