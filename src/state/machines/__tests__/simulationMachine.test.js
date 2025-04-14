import { createActor } from 'xstate';
import { simulationMachine } from '../simulationMachine';

describe('Simulation State Machine', () => {
  const speed = {
    particleSpeed: 0.002,
    speedMultiplier: 1.0,
  };

  const createInput = (overrides = {}) => ({
    speed,
    virtualNodes: [
      { id: 'node1', position: 0.1 },
      { id: 'node2', position: 0.5 },
      { id: 'node3', position: 0.9 },
    ],
    userRequests: [
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

  test('should transition through spawning to running state on START', async () => {
    simulationService.send({ type: 'START' });
    expect(simulationService.getSnapshot().value).toBe('spawning');

    simulationService.send({ type: 'TICK', time: performance.now() });
    expect(simulationService.getSnapshot().value).toBe('running');

    const { particleRefs } = simulationService.getSnapshot().context;
    expect(particleRefs).toHaveLength(3);
    expect(particleRefs.every(p => p.getSnapshot().status !== 'done')).toBe(true);
  });

  test('should handle particle updates', async () => {
    simulationService.send({ type: 'START' });
    simulationService.send({ type: 'TICK', time: performance.now() });
    const now = performance.now();

    simulationService.send({
      type: 'TICK',
      time: now,
      deltaTime: 16.667,
    });

    const { particleRefs } = simulationService.getSnapshot().context;
    expect(particleRefs[0].getSnapshot().value).toBe('initial');
    expect(particleRefs[0].getSnapshot().status).not.toBe('done');
  });

  test('should complete cycle when all particles are done', async () => {
    simulationService.send({ type: 'START' });
    simulationService.send({ type: 'TICK', time: performance.now() });

    let now = performance.now();
    const frameTime = 16.667;

    for (let i = 0; i < 300; i++) {
      now += frameTime;
      simulationService.send({
        type: 'TICK',
        time: now,
        deltaTime: frameTime,
      });
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    const snapshot = simulationService.getSnapshot();
    expect(snapshot.value).toBe('running');
    expect(snapshot.context.cycleCount).toBe(1);

    expect(snapshot.context.particleRefs).toHaveLength(3);
    expect(snapshot.context.particleRefs.every(p => p.getSnapshot().status !== 'done')).toBe(true);
  });

  test('should pause and resume simulation', async () => {
    simulationService.send({ type: 'START' });
    simulationService.send({ type: 'TICK', time: performance.now() });
    expect(simulationService.getSnapshot().value).toBe('running');

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
