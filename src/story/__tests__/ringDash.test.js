import { arcRanges, buildDashPattern, windowRanges } from '../ringDash';
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

describe('arcRanges', () => {
  const total = ranges => ranges.reduce((sum, range) => sum + (range.to - range.from), 0);

  it('runs backwards from the position it ends at', () => {
    const [only] = arcRanges(0.5, 0.2);

    expect(only.to).toBeCloseTo(0.5, 10);
    expect(only.from).toBeCloseTo(0.3, 10);
  });

  it('splits at the seam so every range can be drawn without a special case', () => {
    const [tail, head] = arcRanges(0.1, 0.3);

    expect(tail.from).toBeCloseTo(0.8, 10);
    expect(tail.to).toBe(1);
    expect(head.from).toBe(0);
    expect(head.to).toBeCloseTo(0.1, 10);
    expect(total(arcRanges(0.1, 0.3))).toBeCloseTo(0.3, 10);
  });

  /** A sweep starts at nothing, and nothing must not become a degenerate mark. */
  it('draws nothing at zero length and everything at full length', () => {
    expect(arcRanges(0.4, 0)).toEqual([]);
    expect(arcRanges(0.4, 1)).toEqual([{ from: 0, to: 1 }]);
    expect(buildDashPattern(arcRanges(0.4, 0))).toBeNull();
  });

  /** An arc ending exactly on the seam is the case that used to draw a disc. */
  it('leaves no zero-length range when it ends on the seam', () => {
    const ranges = arcRanges(0, 0.25);

    expect(ranges.length).toBe(1);
    expect(ranges[0].from).toBeCloseTo(0.75, 10);
    expect(ranges[0].to).toBe(1);
    expect(buildDashPattern(ranges).dashArray).not.toMatch(/(^| )0\.0000000/);
  });

  it('keeps its length through every part of a sweep', () => {
    for (let sweep = 0.05; sweep <= 1; sweep += 0.05) {
      expect(total(arcRanges(0.1622, sweep * 0.332))).toBeCloseTo(sweep * 0.332, 10);
    }
  });
});

describe('windowRanges', () => {
  const RANGES = [
    { serverId: 'a', from: 0, to: 0.25 },
    { serverId: 'b', from: 0.25, to: 0.5 },
    { serverId: 'c', from: 0.5, to: 1 },
  ];
  const total = ranges => ranges.reduce((sum, range) => sum + (range.to - range.from), 0);

  it('rescales the window to fill nought to one', () => {
    const inside = windowRanges(RANGES, 0.2, 0.2);

    expect(total(inside)).toBeCloseTo(1, 10);
    expect(inside.map(range => range.serverId)).toEqual(['a', 'b']);
    // A quarter of the window is `a`, the rest is `b`.
    expect(inside[0].to).toBeCloseTo(0.25, 10);
  });

  it('keeps what is inside and drops what is not', () => {
    expect(windowRanges(RANGES, 0.6, 0.2).map(range => range.serverId)).toEqual(['c']);
  });

  /**
   * A window near the seam holds ranges from both ends of the space, and neither
   * offset alone finds both — which is why every range is tried twice.
   */
  it('spans the seam', () => {
    const inside = windowRanges(RANGES, 0.9, 0.2);

    expect(total(inside)).toBeCloseTo(1, 10);
    expect(new Set(inside.map(range => range.serverId))).toEqual(new Set(['a', 'c']));
  });

  it('fills the window wherever it is put', () => {
    for (let from = 0; from < 1; from += 0.037) {
      expect(total(windowRanges(RANGES, from, 0.05))).toBeCloseTo(1, 9);
    }
  });

  it('draws nothing for an empty window', () => {
    expect(windowRanges(RANGES, 0.3, 0)).toEqual([]);
  });

  /** A straight path starts where it starts, unlike a circle. */
  it('measures a line pattern from its own beginning', () => {
    const ranges = [{ from: 0.25, to: 0.5 }];

    expect(buildDashPattern(ranges, { pathStart: 0 }).dashOffset).toBeCloseTo(0.75, 10);
    expect(buildDashPattern(ranges).dashOffset).toBeCloseTo(0.5, 10);
  });
});
