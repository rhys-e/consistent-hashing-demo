import { buildDashPattern } from '../ringDash';
import { buildTopology } from '../ringModel';

const parse = pattern => pattern.dashArray.split(' ').map(Number);
const dashes = pattern => parse(pattern).filter((_, index) => index % 2 === 0);
const total = pattern => parse(pattern).reduce((sum, value) => sum + value, 0);

describe('buildDashPattern', () => {
  it('starts on the first span, carrying the phase in the offset', () => {
    const pattern = buildDashPattern([{ from: 0.1, to: 0.3 }]);

    expect(parse(pattern)).toEqual([0.2, 0.8]);
    // Three o'clock is position 0.75, so the pattern shifts to begin at 0.1.
    expect(pattern.dashOffset).toBeCloseTo(0.65, 6);
  });

  it('alternates dash and gap across several spans', () => {
    expect(
      parse(
        buildDashPattern([
          { from: 0, to: 0.2 },
          { from: 0.5, to: 0.6 },
        ])
      )
    ).toEqual([0.2, 0.3, 0.1, 0.4]);
  });

  it('sorts spans it is given out of order', () => {
    expect(
      buildDashPattern([
        { from: 0.5, to: 0.6 },
        { from: 0, to: 0.2 },
      ])
    ).toEqual(
      buildDashPattern([
        { from: 0, to: 0.2 },
        { from: 0.5, to: 0.6 },
      ])
    );
  });

  it('merges spans that touch into one span of ownership', () => {
    expect(
      parse(
        buildDashPattern([
          { from: 0.1, to: 0.2 },
          { from: 0.2, to: 0.35 },
        ])
      )
    ).toEqual([0.25, 0.75]);
  });

  /**
   * A range ending at the seam and one starting at it are a single span across it.
   * Treated as two, they leave a zero-length gap between them at the bottom of the
   * ring, which is where the disc artefact used to appear.
   */
  it('joins a span that crosses the seam', () => {
    const pattern = buildDashPattern([
      { from: 0, to: 0.1 },
      { from: 0.4, to: 0.5 },
      { from: 0.9, to: 1 },
    ]);

    expect(parse(pattern)).toEqual([0.2, 0.3, 0.1, 0.4]);
    expect(pattern.dashOffset).toBeCloseTo(0.85, 6);
  });

  it('describes a server that owns nothing by drawing nothing', () => {
    expect(buildDashPattern([])).toBeNull();
  });

  it('describes a server that owns everything as a solid ring', () => {
    expect(buildDashPattern([{ from: 0, to: 1 }])).toEqual({ dashArray: null, dashOffset: 0 });
  });

  it('drops spans too small to draw, without shifting the ones around them', () => {
    const withDegenerate = buildDashPattern([
      { from: 0.1, to: 0.2 },
      { from: 0.5, to: 0.5 + 9e-8 },
      { from: 0.7, to: 0.8 },
    ]);

    expect(withDegenerate).toEqual(
      buildDashPattern([
        { from: 0.1, to: 0.2 },
        { from: 0.7, to: 0.8 },
      ])
    );
  });

  /**
   * The rule the module exists to keep. A renderer handed a zero-length dash or
   * gap has no tangent to orient the stroke by and draws a disc the width of the
   * stroke instead — a mark orders of magnitude larger than the range it stands
   * for, which spins as the geometry moves because its orientation is undefined.
   */
  it.each([1, 3, 40, 400])(
    'never emits a degenerate entry at %s vnodes per server',
    vnodesPerServer => {
      const topology = buildTopology({
        servers: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
        vnodesPerServer,
      });

      topology.servers.forEach(server => {
        const ranges = topology.ranges.filter(range => range.serverId === server.id);
        const pattern = buildDashPattern(ranges);
        if (!pattern?.dashArray) return;

        parse(pattern).forEach(value => expect(value).toBeGreaterThan(0));
      });
    }
  );

  it.each([1, 40, 300])('spans exactly one lap at %s vnodes per server', vnodesPerServer => {
    const topology = buildTopology({
      servers: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      vnodesPerServer,
    });

    topology.servers.forEach(server => {
      const ranges = topology.ranges.filter(range => range.serverId === server.id);
      const pattern = buildDashPattern(ranges);
      if (!pattern?.dashArray) return;

      expect(total(pattern)).toBeCloseTo(1, 5);
    });
  });

  it('keeps the dash total equal to the share the server owns', () => {
    const topology = buildTopology({ servers: [{ id: 'a' }, { id: 'b' }], vnodesPerServer: 50 });
    const ranges = topology.ranges.filter(range => range.serverId === 'a');
    const share = ranges.reduce((sum, range) => sum + (range.to - range.from), 0);
    const inked = dashes(buildDashPattern(ranges)).reduce((sum, value) => sum + value, 0);

    expect(inked).toBeCloseTo(share, 5);
  });

  it('produces an even-length pattern so it repeats in phase', () => {
    [[{ from: 0, to: 0.5 }], [{ from: 0.2, to: 0.4 }]].forEach(ranges => {
      expect(parse(buildDashPattern(ranges)).length % 2).toBe(0);
    });
  });
});
