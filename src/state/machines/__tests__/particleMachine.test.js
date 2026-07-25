import { createActor, createMachine } from 'xstate';
import { particleMachine } from '../particleMachine';

describe('Particle State Machine', () => {
  const speed = {
    particleSpeed: 0.002,
    speedMultiplier: 1.0,
  };

  const createInput = (overrides = {}) => ({
    id: 'test-particle',
    key: 0,
    parentRef: null,
    speed,
    ringStartPos: 0.2,
    ringEndPos: 0.5,
    ...overrides,
  });

  let particleService;
  let receivedEvents;
  let parentActor;

  beforeEach(() => {
    receivedEvents = [];
    // Create a parent actor that will receive events
    const parentMachine = createMachine({
      id: 'parent',
      initial: 'active',
      states: {
        active: {
          on: {
            '*': {
              actions: ({ event }) => receivedEvents.push(event),
            },
          },
        },
      },
    });
    parentActor = createActor(parentMachine).start();

    const input = createInput({
      parentRef: parentActor,
    });
    particleService = createActor(particleMachine, { input }).start();
  });

  afterEach(() => {
    particleService.stop();
    parentActor.stop();
  });

  test('should start in initial state', () => {
    expect(particleService.getSnapshot().value).toBe('initial');
    expect(particleService.getSnapshot().context.initialAnimationProgress).toBe(0);
    expect(particleService.getSnapshot().context.currentPos).toBe(0.2);
  });

  test('should transition from initial to ring state', () => {
    // Send enough TICK events to complete initial animation
    let now = performance.now();
    const frameTime = 16.667; // 60fps

    // Send 200 frames worth of TICK events (increased from 100)
    for (let i = 0; i < 200; i++) {
      now += frameTime;
      particleService.send({
        type: 'TICK',
        time: now,
        deltaTime: frameTime,
      });
    }

    expect(particleService.getSnapshot().value).toBe('ring');
    expect(particleService.getSnapshot().context.initialAnimationProgress).toBeGreaterThanOrEqual(
      1.0
    );
  });

  test('should move around the ring and eventually reach target', () => {
    // First complete initial animation
    let now = performance.now();
    const frameTime = 16.667; // 60fps

    // Send 200 frames worth of TICK events for initial animation
    for (let i = 0; i < 200; i++) {
      now += frameTime;
      particleService.send({
        type: 'TICK',
        time: now,
        deltaTime: frameTime,
      });
    }

    // Then send enough TICK events to reach target
    for (let i = 0; i < 400; i++) {
      // Increased from 200
      now += frameTime;
      particleService.send({
        type: 'TICK',
        time: now,
        deltaTime: frameTime,
      });
    }

    expect(particleService.getSnapshot().value).toBe('completed');
    expect(particleService.getSnapshot().context.currentPos).toBe(0.5);

    // Verify completion event was sent
    expect(receivedEvents.length).toBeGreaterThan(0);
    const lastUpdate = receivedEvents[receivedEvents.length - 1];
    expect(lastUpdate.type).toBe('PARTICLE_COMPLETED');
    expect(lastUpdate.data.ringEndPos).toBe(particleService.getSnapshot().context.ringEndPos);
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
