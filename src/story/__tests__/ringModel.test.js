import {
  buildRanges,
  buildTopology,
  hashPosition,
  ownershipShares,
  remapDelta,
  resolveOwner,
} from '../ringModel';

const SERVERS = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta'].map(id => ({ id }));

const topologyOf = (count, vnodesPerServer) =>
  buildTopology({ servers: SERVERS.slice(0, count), vnodesPerServer });

describe('hashPosition', () => {
  it('lands in the unit interval', () => {
    for (let index = 0; index < 500; index++) {
      const position = hashPosition(`key:${index}`);
      expect(position).toBeGreaterThanOrEqual(0);
      expect(position).toBeLessThan(1);
    }
  });

  it('is deterministic', () => {
    expect(hashPosition('server-a#7')).toBe(hashPosition('server-a#7'));
    expect(hashPosition('server-a#7')).not.toBe(hashPosition('server-a#8'));
  });
});

describe('ranges', () => {
  it('tile the whole hash space exactly once', () => {
    const { ranges } = topologyOf(6, 40);
    const ordered = [...ranges].sort((left, right) => left.from - right.from);

    expect(ordered[0].from).toBe(0);
    expect(ordered[ordered.length - 1].to).toBe(1);
    ordered.slice(1).forEach((range, index) => {
      expect(range.from).toBe(ordered[index].to);
    });
  });

  it('give each range to the first vnode clockwise of it', () => {
    const vnodes = [
      { serverId: 'a', vnodeId: 'a#0', position: 0.25 },
      { serverId: 'b', vnodeId: 'b#0', position: 0.75 },
    ];

    expect(buildRanges(vnodes)).toEqual([
      { serverId: 'a', vnodeId: 'a#0', from: 0, to: 0.25 },
      { serverId: 'b', vnodeId: 'b#0', from: 0.25, to: 0.75 },
      { serverId: 'a', vnodeId: 'a#0', from: 0.75, to: 1 },
    ]);
  });
});

describe('resolveOwner', () => {
  const topology = {
    vnodes: [{ position: 0.25 }, { position: 0.75 }].map((vnode, index) => ({
      ...vnode,
      serverId: index === 0 ? 'a' : 'b',
    })),
  };

  it.each([
    [0, 'a'],
    [0.25, 'a'],
    [0.3, 'b'],
    [0.75, 'b'],
    [0.9, 'a'],
  ])('gives position %s to %s', (position, serverId) => {
    expect(resolveOwner(topology, position).serverId).toBe(serverId);
  });
});

describe('ownershipShares', () => {
  it('accounts for the entire hash space', () => {
    const shares = ownershipShares(topologyOf(6, 200));
    const total = shares.reduce((sum, server) => sum + server.share, 0);

    expect(total).toBeCloseTo(1, 10);
  });

  /**
   * The reason the full-scale scene can state a share at all: with enough vnodes
   * the spread is even enough that a summary is a fair description rather than a
   * convenient one.
   */
  it('evens out as vnodes per server rise', () => {
    const spread = vnodesPerServer => {
      const shares = ownershipShares(topologyOf(6, vnodesPerServer)).map(server => server.share);
      return Math.max(...shares) - Math.min(...shares);
    };

    expect(spread(1)).toBeGreaterThan(spread(500));
    expect(spread(500)).toBeLessThan(0.05);
  });
});

describe('remapDelta', () => {
  it('moves nothing when the topology is unchanged', () => {
    const topology = topologyOf(6, 120);

    expect(remapDelta(topology, topology)).toEqual({ ranges: [], fraction: 0 });
  });

  /**
   * The claim the whole demo exists to make. A seventh server should take about a
   * seventh of the space, and take it from everyone rather than from a neighbour.
   */
  it('moves roughly one seventh of the space when a seventh server joins', () => {
    const before = buildTopology({ servers: SERVERS, vnodesPerServer: 200 });
    const after = buildTopology({
      servers: [...SERVERS, { id: 'eta' }],
      vnodesPerServer: 200,
    });

    const { ranges, fraction } = remapDelta(before, after);

    expect(fraction).toBeCloseTo(1 / 7, 1);
    expect(ranges.every(range => range.serverId === 'eta')).toBe(true);
    expect(new Set(ranges.map(range => range.fromServerId)).size).toBe(SERVERS.length);
  });

  /**
   * Scene 3's argument: with one position per server, a departure lands entirely
   * on the single neighbour clockwise of it.
   */
  it('dumps a departing server onto one neighbour when there are no vnodes', () => {
    const before = buildTopology({ servers: SERVERS.slice(0, 3), vnodesPerServer: 1 });
    const departing = before.vnodes[1].serverId;
    const after = buildTopology({
      servers: SERVERS.slice(0, 3).filter(server => server.id !== departing),
      vnodesPerServer: 1,
    });

    const { ranges, fraction } = remapDelta(before, after);
    const absorbers = new Set(ranges.map(range => range.serverId));

    expect(absorbers.size).toBe(1);
    expect(fraction).toBeCloseTo(
      ownershipShares(before).find(server => server.id === departing).share,
      10
    );
  });
});
