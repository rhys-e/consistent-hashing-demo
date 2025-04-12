import { createActor, fromCallback } from 'xstate';
import { particleMachine } from '../machines/particleMachine';

describe('Particle State Machine', () => {
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

  const center = {
    x: dimensions.SVG_WIDTH / 2,
    y: dimensions.SVG_HEIGHT / 2,
  };

  const createInput = (overrides = {}) => ({
    parentRef: null, // Will be set in beforeEach
    key: 0,
    ringStartPos: 0.3652613142890067,
    ringEndPos: 0.5,
    dimensions,
    speed,
    center,
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
        receive(event => {
          receivedEvents.push(event);
        });
      })
    ).start();

    // Create a particle machine with standard input
    const input = createInput({ parentRef: parentActor });
    particleService = createActor(particleMachine, { input }).start();
  });

  afterEach(() => {
    parentActor.stop();
  });

  test('should start in initial state', () => {
    expect(particleService.getSnapshot().value).toBe('initial');
    expect(particleService.getSnapshot().context.currentX).toBe(center.x);
    expect(particleService.getSnapshot().context.currentY).toBe(center.y);
    expect(particleService.getSnapshot().context.initialAnimationProgress).toBe(0);
  });

  test('should transition from initial to ring state', () => {
    const now = performance.now();
    // Send multiple TICK events to complete the initial animation
    for (let i = 0; i < 110; i++) {
      particleService.send({
        type: 'TICK',
        time: now + i * 16.667,
        deltaTime: 16.667,
      });
    }

    // Assert ring state
    expect(particleService.getSnapshot().value).toBe('ring');
    expect(particleService.getSnapshot().context.initialAnimationProgress).toBeGreaterThanOrEqual(
      1
    );

    // Verify parent received PARTICLE_UPDATED events
    const updateEvents = receivedEvents.filter(e => e.type === 'PARTICLE_UPDATED');
    expect(updateEvents.length).toBeGreaterThan(0);
    expect(updateEvents[0]).toMatchObject({
      type: 'PARTICLE_UPDATED',
      key: 0,
    });
  });

  test('should move around the ring and eventually reach target', () => {
    // First move to ring state
    let now = performance.now();
    for (let i = 0; i < 100; i++) {
      now += 16.667;
      particleService.send({
        type: 'TICK',
        time: now,
        deltaTime: 16.667,
      });
    }

    // Then move around ring until target is reached
    for (let i = 0; i < 70; i++) {
      now += 16.667;
      particleService.send({
        type: 'TICK',
        time: now,
        deltaTime: 16.667,
      });
    }

    // Assert completed state
    expect(particleService.getSnapshot().value).toBe('completed');
    expect(particleService.getSnapshot().context.currentPos).toBe(
      particleService.getSnapshot().context.ringEndPos
    );

    // Verify final position update was sent
    const lastUpdate = receivedEvents[receivedEvents.length - 1];
    expect(lastUpdate.type).toBe('PARTICLE_UPDATED');
    expect(lastUpdate.pos).toBe(particleService.getSnapshot().context.ringEndPos);
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
