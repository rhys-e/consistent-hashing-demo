import { createActor } from 'xstate';
import { simulationMachine } from '../machines/simulationMachine';

describe('Simulation State Machine', () => {
  // Test configuration
  const dimensions = {
    SVG_WIDTH: 817,
    SVG_HEIGHT: 817,
    SVG_RADIUS: 347,
  };

  const speed = {
    particleSpeed: 0.002,
    speedMultiplier: 1.0,
  };

  const createInput = (overrides = {}) => ({
    dimensions,
    speed,
    ringNodes: [
      { id: 'node1', position: 0.1 },
      { id: 'node2', position: 0.5 },
      { id: 'node3', position: 0.9 },
    ],
    fixedRequests: [
      { key: 'req1', position: 0.2 },
      { key: 'req2', position: 0.6 },
      { key: 'req3', position: 0.8 },
    ],
    ...overrides,
  });

  let simulationService;

  beforeEach(() => {
    const input = createInput();
    simulationService = createActor(simulationMachine, { input }).start();
  });

  afterEach(() => {
    simulationService.stop();
  });

  test('should start in idle state', () => {
    expect(simulationService.getSnapshot().value).toBe('idle');
  });

  test('should transition through spawning to running state on START', () => {
    simulationService.send({ type: 'START' });
    expect(simulationService.getSnapshot().value).toBe('running');

    const { particleRefs, pCurPos, pRingInitialPos } = simulationService.getSnapshot().context;
    expect(particleRefs).toHaveLength(3);
    expect(pCurPos).toHaveLength(0);
    expect(pRingInitialPos).toHaveLength(3);
  });

  test('should handle particle updates', () => {
    simulationService.send({ type: 'START' });
    const now = performance.now();

    // Send a TICK event
    simulationService.send({
      type: 'TICK',
      time: now,
    });

    // Simulate a particle update
    simulationService.send({
      type: 'PARTICLE_UPDATED',
      key: 0,
      pos: 0.3,
      x: 100,
      y: 100,
    });

    const { pCurPos, particleRefs } = simulationService.getSnapshot().context;
    expect(pCurPos[0]).toMatchObject({
      phase: 'initial',
      pos: 0.3,
      x: 100,
      y: 100,
    });
    expect(particleRefs[0].completed).toBe(false);
  });

  test('should complete cycle when all particles are done', () => {
    simulationService.send({ type: 'START' });

    // Send enough TICK events to complete all particles
    // Each particle needs to:
    // 1. Complete initial animation (about 100 frames)
    // 2. Complete ring animation (about 200 frames)
    let now = performance.now();
    const frameTime = 16.667; // 60fps

    // Send 300 frames worth of TICK events
    for (let i = 0; i < 300; i++) {
      now += frameTime;
      simulationService.send({
        type: 'TICK',
        time: now,
        deltaTime: frameTime,
      });
    }

    // Should be in running state with incremented cycle count
    const snapshot = simulationService.getSnapshot();
    expect(snapshot.value).toBe('running');
    expect(snapshot.context.cycleCount).toBe(1);

    // Verify new particles are spawned
    expect(snapshot.context.particleRefs).toHaveLength(3);
    expect(snapshot.context.particleRefs.every(p => !p.completed)).toBe(true);
  });

  test('should pause and resume simulation', () => {
    simulationService.send({ type: 'START' });
    simulationService.send({ type: 'PAUSE' });
    expect(simulationService.getSnapshot().value).toBe('idle');
    expect(simulationService.getSnapshot().context.lastTickTime).toBeNull();

    simulationService.send({ type: 'RESUME' });
    expect(simulationService.getSnapshot().value).toBe('running');
  });

  test('should update context on UPDATE event', () => {
    const newSpeed = {
      particleSpeed: 0.004,
      speedMultiplier: 2.0,
    };

    simulationService.send({
      type: 'UPDATE',
      payload: { speed: newSpeed },
    });

    expect(simulationService.getSnapshot().context.speed).toEqual(newSpeed);
  });
});
