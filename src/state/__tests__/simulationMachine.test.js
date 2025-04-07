import { createActor, fromCallback } from 'xstate';
import { simulationMachine } from '../simulationMachine'; // <--- adjust path as needed

describe('Simulation State Machine', () => {
  let simulationService;
  let parentActor;
  let receivedEvents;

  // Example "fixedRequests" to pass into the simulation
  const fixedRequests = [
    { id: 'p1', position: 0.2, targetPos: 0.3 },
    { id: 'p2', position: 0.4, targetPos: 0.5 },
    { id: 'p3', position: 0.6, targetPos: 0.8 },
  ];

  const createInitialProps = (overrides = {}) => ({
    fixedRequests,
    SVG_WIDTH: 817,
    SVG_HEIGHT: 817,
    SVG_RADIUS: 347,
    PARTICLE_SPEED: 0.002,
    speedMultiplier: 1.0,
    ...overrides,
  });

  beforeEach(() => {
    receivedEvents = [];

    // We'll create a simple "parent" actor that logs events
    parentActor = createActor(
      fromCallback(({ receive }) => {
        // Collect events (if the simulationMachine or children send them)
        receive(evt => receivedEvents.push(evt));
      })
    ).start();

    // Create the simulation machine actor
    simulationService = createActor(simulationMachine(createInitialProps()), {
      parent: parentActor,
    }).start();
  });

  afterEach(() => {
    parentActor.stop();
  });

  test('should start in idle', () => {
    expect(simulationService.getSnapshot().value).toBe('idle');
    const { cycleCount, particleRefs } = simulationService.getSnapshot().context;
    expect(cycleCount).toBe(0);
    expect(particleRefs).toEqual([]);
  });

  test('should move to running on START and spawn particles', () => {
    simulationService.send({ type: 'START' });
    expect(simulationService.getSnapshot().value).toBe('running');

    const { particleRefs } = simulationService.getSnapshot().context;
    // We expect 3, given the fixedRequests above
    expect(particleRefs.length).toBe(fixedRequests.length);
  });

  test('should stay in running until all particles are done', () => {
    simulationService.send({ type: 'START' });
    let snapshot = simulationService.getSnapshot();
    expect(snapshot.value).toBe('running');
    expect(snapshot.context.particleRefs.length).toBe(3);

    // Send PARTICLE_DONE for one particle
    simulationService.send({
      type: 'PARTICLE_DONE',
      particleId: 'p1',
    });

    snapshot = simulationService.getSnapshot();
    expect(snapshot.value).toBe('running');
    expect(snapshot.context.particleRefs.length).toBe(2);

    // Send PARTICLE_DONE for a second particle
    simulationService.send({
      type: 'PARTICLE_DONE',
      particleId: 'p2',
    });

    snapshot = simulationService.getSnapshot();
    expect(snapshot.value).toBe('running');
    expect(snapshot.context.particleRefs.length).toBe(1);

    // Finally, last particle
    simulationService.send({
      type: 'PARTICLE_DONE',
      particleId: 'p3',
    });

    snapshot = simulationService.getSnapshot();
    // Now we should have 0 refs, and the guard allParticlesDone should pass
    expect(snapshot.value).toBe('running');
    expect(snapshot.context.particleRefs.length).toBe(3);
  });

  test('increments cycleCount and returns to running after last particle is done', () => {
    simulationService.send({ type: 'START' });

    // Confirm initial
    let snapshot = simulationService.getSnapshot();
    expect(snapshot.value).toBe('running');
    expect(snapshot.context.cycleCount).toBe(0);

    // Mark p1, p2 done
    simulationService.send({ type: 'PARTICLE_DONE', particleId: 'p1' });
    simulationService.send({ type: 'PARTICLE_DONE', particleId: 'p2' });
    snapshot = simulationService.getSnapshot();
    expect(snapshot.value).toBe('running');
    expect(snapshot.context.particleRefs.length).toBe(1);

    // Mark last done
    simulationService.send({ type: 'PARTICLE_DONE', particleId: 'p3' });

    // Now ephemeral cycleComplete -> running
    snapshot = simulationService.getSnapshot();
    expect(snapshot.value).toBe('running');
    // Cycle count incremented
    expect(snapshot.context.cycleCount).toBe(1);

    // Also check we spawned new set of particles if that’s your design
    expect(snapshot.context.particleRefs.length).toBe(fixedRequests.length);
  });
});
