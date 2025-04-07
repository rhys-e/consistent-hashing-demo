import { createActor, fromCallback } from 'xstate';
import { createParticleMachine } from '../particleMachine';
describe('Particle State Machine', () => {
  // Test configuration
  const SVG_WIDTH = 817;
  const SVG_HEIGHT = 817;
  const SVG_RADIUS = 347;
  const PARTICLE_SPEED = 0.002;

  const createInitialProps = (overrides = {}) => ({
    id: 'test-particle-id',
    spawnPos: 0.3652613142890067,
    targetPos: 0.5,
    targetNodeId: 'node1',
    SVG_WIDTH,
    SVG_HEIGHT,
    SVG_RADIUS,
    PARTICLE_SPEED,
    speedMultiplier: 1.0,
    ...overrides,
  });

  let particleService;
  let parentActor;
  let receivedEvents = [];

  beforeEach(() => {
    // Reset received events
    receivedEvents = [];

    // Create a simple parent actor that collects events from children
    parentActor = createActor(
      fromCallback(({ receive }) => {
        // Collect events sent from child actors
        receive(event => {
          receivedEvents.push(event);
        });
      })
    ).start();

    // Create a particle machine with standard props
    const machine = createParticleMachine(createInitialProps());
    particleService = createActor(machine, {
      parent: parentActor, // Connect to parent actor
    }).start();
  });

  afterEach(() => {
    // Only stop the parent - it will stop its children automatically
    parentActor.stop();
  });

  test('should start in initial state', () => {
    // Assert initial state
    expect(particleService.getSnapshot().value).toBe('initial');
    expect(particleService.getSnapshot().context.currentX).toBe(SVG_WIDTH / 2);
    expect(particleService.getSnapshot().context.currentY).toBe(SVG_HEIGHT / 2);
    expect(particleService.getSnapshot().context.initialAnimationProgress).toBe(0);
  });

  test('should transition from initial to ring state', () => {
    // Send multiple TICK events to complete the initial animation
    const now = Date.now();
    for (let i = 0; i < 110; i++) {
      particleService.send({
        type: 'TICK',
        time: now + i * 16.667,
      });
    }

    // Assert ring state
    expect(particleService.getSnapshot().value).toBe('ring');
    expect(particleService.getSnapshot().context.initialAnimationProgress).toBeGreaterThanOrEqual(
      1
    );
  });

  test('should move around the ring and eventually reach target', () => {
    // First move to ring state
    let now = Date.now();
    for (let i = 0; i < 100; i++) {
      now += 16.667;
      particleService.send({
        type: 'TICK',
        time: now,
      });
    }

    // Then move around ring until target is reached
    for (let i = 0; i < 70; i++) {
      now += 16.667;
      particleService.send({
        type: 'TICK',
        time: now,
      });
    }

    // Assert completed state
    expect(particleService.getSnapshot().value).toBe('completed');
    expect(particleService.getSnapshot().context.completedAt).not.toBeNull();
    expect(particleService.getSnapshot().context.currentPos).toBe(
      particleService.getSnapshot().context.targetPos
    );

    // Assert parent received events
    expect(receivedEvents.length).toBeGreaterThan(0);

    // Assert PARTICLE_DONE event was sent
    const particleDoneEvent = receivedEvents.find(e => e.type === 'PARTICLE_DONE');
    expect(particleDoneEvent).toBeDefined();

    // Assert XState done event was sent
    const doneEvent = receivedEvents.find(e => e.type.startsWith('xstate.done.actor'));
    expect(doneEvent).toBeDefined();
    expect(doneEvent.actorId).toBeDefined();
  });

  // test('should handle rerouting to a different target', () => {
  //   particleService.start();

  //   // Move to ring state
  //   for (let i = 0; i < 10; i++) {
  //     particleService.send({
  //       type: 'TICK',
  //       deltaTime: 16.667,
  //       time: Date.now(),
  //     });
  //   }

  //   // Send reroute event with direct targets
  //   particleService.send({
  //     type: 'REROUTE',
  //     newTargetPos: 0.8,
  //     newTargetNodeId: 'node2',
  //   });

  //   // Check if context was updated correctly
  //   expect(particleService.state.context.rerouted).toBe(true);
  //   expect(particleService.state.context.oldTargetPos).toBe(0.5);
  //   expect(particleService.state.context.oldTargetNodeId).toBe('node1');
  //   expect(particleService.state.context.targetPos).toBe(0.8);
  //   expect(particleService.state.context.targetNodeId).toBe('node2');
  // });

  // test('should handle rerouting via ringNodes recalculation', () => {
  //   // Create a machine with a specific initial position
  //   const machine = createParticleMachine(
  //     createInitialProps({
  //       initialPos: 0.3,
  //       targetPos: 0.4,
  //       targetNodeId: 'node1',
  //     })
  //   );

  //   const service = interpret(machine).start();

  //   // Move to ring state
  //   for (let i = 0; i < 10; i++) {
  //     service.send({
  //       type: 'TICK',
  //       deltaTime: 16.667,
  //       time: Date.now(),
  //     });
  //   }

  //   // Mock a new ring structure
  //   const newRingNodes = {
  //     node2: { id: 'node2', position: 0.2 },
  //     node3: { id: 'node3', position: 0.6 },
  //   };

  //   // Send reroute event with ring nodes
  //   service.send({
  //     type: 'REROUTE',
  //     ringNodes: newRingNodes,
  //   });

  //   // The responsible node should now be node3 (position 0.6)
  //   // since our particle's initialPos is 0.3
  //   expect(service.state.context.rerouted).toBe(true);
  //   expect(service.state.context.oldTargetNodeId).toBe('node1');
  //   expect(service.state.context.targetNodeId).toBe('node3');
  //   expect(service.state.context.targetPos).toBe(0.6);
  // });

  // test('should transition to postCompleted after completed', () => {
  //   // Create a particle that's already completed
  //   const completedMachine = createParticleMachine({
  //     ...createInitialProps(),
  //     phase: 'COMPLETED',
  //   });

  //   const service = interpret(completedMachine).start();

  //   // Send POST_COMPLETE event to trigger transition
  //   service.send({ type: 'POST_COMPLETE' });

  //   // Check if we're in post-completed state
  //   expect(service.state.value).toBe('postCompleted');
  //   expect(service.state.context.phase).toBe('POST_COMPLETED');
  //   expect(service.state.done).toBe(true); // Final state should be reached
  // });
});
