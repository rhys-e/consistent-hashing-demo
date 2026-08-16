import {
  buildSandbox,
  initialSandbox,
  INITIAL_SANDBOX,
  POSITION_STEPS,
  SANDBOX_LIMITS,
  sandboxReducer,
  moduloCost,
} from '../sandbox';

const pct = value => Number((value * 100).toFixed(1));
const apply = (state, ...actions) => actions.reduce(sandboxReducer, state);

describe('the sandbox model', () => {
  it('opens where the story left off', () => {
    const built = buildSandbox(initialSandbox());

    expect(INITIAL_SANDBOX.vnodesPerServer).toBe(150);
    expect(built.servers.length).toBe(6);
    expect(built.change).toBeNull();
  });

  it('will not go below two servers or above the palette', () => {
    let state = initialSandbox();
    for (let step = 0; step < 12; step++) state = sandboxReducer(state, { type: 'DROP_SERVER' });
    expect(state.serverCount).toBe(SANDBOX_LIMITS.minServers);

    for (let step = 0; step < 20; step++) state = sandboxReducer(state, { type: 'ADD_SERVER' });
    expect(state.serverCount).toBe(SANDBOX_LIMITS.maxServers);
  });

  /**
   * The claim Scene 7 makes, at whatever number the viewer picks: adding a server
   * to a ring of n moves roughly 1/(n+1) of it, and nothing else.
   */
  it('moves about a share of the ring when a server is added', () => {
    [3, 5, 7].forEach(serverCount => {
      const state = apply({ ...INITIAL_SANDBOX, serverCount, from: null }, { type: 'ADD_SERVER' });
      const { change } = buildSandbox(state);
      const expected = 1 / (serverCount + 1);

      expect(change.fraction).toBeGreaterThan(expected * 0.8);
      expect(change.fraction).toBeLessThan(expected * 1.2);
      // And every range that moved went *to* the newcomer, not between the others.
      const arrived = new Set(change.ranges.map(range => range.serverId));
      expect([...arrived]).toEqual([`cache-0${serverCount + 1}`]);
    });
  });

  /**
   * Scene 3 and Scene 4, generalised. At one position each a departure lands on a
   * single neighbour; at production density it is shared out among all of them.
   */
  it('concentrates a departure at one position and spreads it at many', () => {
    const takersAt = vnodesPerServer => {
      const state = apply({ serverCount: 6, vnodesPerServer, from: null }, { type: 'DROP_SERVER' });
      return new Set(buildSandbox(state).change.ranges.map(range => range.serverId)).size;
    };

    expect(takersAt(1)).toBe(1);
    expect(takersAt(150)).toBe(5);
  });

  /** The density argument, as the one number that states it. */
  it('tightens the spread as positions are added', () => {
    const spread = shares =>
      Math.max(...shares.map(s => s.share)) - Math.min(...shares.map(s => s.share));
    const spreads = POSITION_STEPS.map(vnodesPerServer =>
      spread(buildSandbox({ serverCount: 6, vnodesPerServer, from: null }).shares)
    );

    expect(pct(spreads[0])).toBeGreaterThan(20);
    expect(pct(spreads.at(-1))).toBeLessThan(3);
    // Not monotonic at small counts — that is sampling noise, and pretending
    // otherwise is what the plan's 1/3/8 stepper got wrong. Only the ends are a
    // claim.
    expect(spreads.at(-1)).toBeLessThan(spreads[0]);
  });

  it('reports a change against the state it changed from', () => {
    const state = apply(initialSandbox(), { type: 'DROP_SERVER' });
    const { change } = buildSandbox(state);

    expect(change.from).toEqual({ serverCount: 6, vnodesPerServer: 150 });
    expect(change.fraction).toBeGreaterThan(0);
  });

  /**
   * Density is a setting, not an event. Costing it under the same heading made
   * one number answer two questions, and a reader could not tell whether it was
   * the price of a server leaving or of turning a dial.
   */
  it('costs a change of roster and not a change of density', () => {
    const denser = apply(initialSandbox(), { type: 'SET_POSITIONS', value: 500 });
    expect(buildSandbox(denser).change).toBeNull();

    // Set the density, then add a server: the cost is of the server.
    const thenAdded = apply(denser, { type: 'ADD_SERVER' });
    expect(buildSandbox(thenAdded).change.from.vnodesPerServer).toBe(500);
  });

  /**
   * Reset is a change like any other, so the readout still says what it cost —
   * a reset that silently reported nothing would be the one action whose effect
   * the sandbox hid.
   */
  it('costs a reset that puts a server back', () => {
    const state = apply(initialSandbox(), { type: 'DROP_SERVER' }, { type: 'RESET' });
    const built = buildSandbox(state);

    expect(built.servers.length).toBe(6);
    expect(built.change.from.serverCount).toBe(5);
    expect(built.change.fraction).toBeGreaterThan(0);
  });

  /**
   * The comparison the story exists to make. Adding a seventh server to six moves
   * about a seventh of the ring; plain modulo moves nearly all of it.
   */
  it('says what the same change would have cost with plain modulo', () => {
    expect(moduloCost(6, 7)).toBeCloseTo(6 / 7, 10);
    expect(moduloCost(3, 2)).toBeCloseTo(2 / 3, 10);
    expect(moduloCost(6, 6)).toBe(0);

    const added = apply(initialSandbox(), { type: 'ADD_SERVER' });
    const { change } = buildSandbox(added);
    expect(change.modulo).toBeGreaterThan(change.fraction * 5);
  });
});
