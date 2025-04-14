import { createMachine, assign, emit } from 'xstate';
import { particleMachine } from './particleMachine';

export const simulationMachine = createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5SwJYFsCuAbAhgFxQHsA7AYgFUAFAEQEEAVAUQG0AGAXUVAAdDUCSXEAA9EANgDMAVgB0AFikTWADmWSJARikAmAOwAaEAE9EG7QF9zh1JlwDiMlBCxhSAZXq0ASvTackILz8RMRCoggaCjIAnLGx2pFyyrpSylKGJgg60TJi0dpicnLaKiqKltbo2Pghjs6uXoxu5ACyLBxCQSj2YaZRcfGJyanpxogSumIy0tESchrRrPkTYhUgNtX2MrDcOADuxCjEUKR+nXzdIb0RrLqsMlK6ykvRUhoS2lJyEhmI2kW5fJiR66ApJKRSNYbOy1ABOGGIh2OpHoAEkAMIAaTOAS6PQC4UeOTmEjET0+t1YrA0vwQEjUMWKZI0ukiK10UKqMJIMnhiKOJzRWOYGn8PAu+NA4Qk9JkykWIOUkS0yh+YwQemU8lYYm0n3y2gk0Tk0U5thqPL5SJOlG8QoAMowAPpUOhMag48XBQQE8a3GSsTSGlnaNKqUaZDTKbTyRQaF7SCEJVZWdZci0OK0C0i28hudpiwISq6+iL9AYJIrDNK00P3OQ6vVSA1Gk1mza1ADGRk7LnRhDQ3BceFcnqL3tCpfjdweTxebw+XzVmXpWqKBSVELyiwsa2IhAgcCE0Iz5wn1wAtDT1caYnGtNE1MpiroOamT1snC4z5cfVLEHIBjqm8xIspIYgQWILKvu23IODs+zWj+koiKYGjArkrLPpIJp3Kw2i0tIEjyEychQZESzRnIsEZryCJIbixZ-qhdKqDIoaLBoCyRDoSjLuMujEs2cwLEshqTDRWzdr2YD9oOw5gMhJb-ggSoaOxJJLrE6EQoRkiMgUurRGSYjJLulhAA */
  id: 'simulation',
  initial: 'idle',
  context: ({ input }) => ({
    cycleCount: 0,
    particleRefs: [],
    hits: [],
    virtualNodes: input.virtualNodes,
    userRequests: input.userRequests,
    speed: input.speed,
    lastTickTime: null,
  }),
  on: {
    UPDATE: {
      actions: 'updateContext',
    },
    PARTICLE_COMPLETED: {
      actions: [
        emit(({ context, event }) => ({
          type: 'particleCompleted',
          data: {
            ...event.data,
            targetNode: findTargetNode(context.virtualNodes, event.ringEndPos),
          },
        })),
      ],
    },
  },
  states: {
    idle: {
      on: {
        START: {
          target: 'spawning',
        },
        RESUME: {
          target: 'running',
        },
      },
    },
    spawning: {
      entry: ['spawnParticles'],
      always: 'running',
    },
    running: {
      on: {
        TICK: [
          {
            guard: 'allParticlesCompleted',
            target: 'cycleComplete',
          },
          {
            actions: ['forwardTickToParticles'],
          },
        ],
        PAUSE: {
          target: 'idle',
          actions: 'pauseParticles',
        },
      },
    },
    cycleComplete: {
      entry: [
        'incrementCycleCount',
        emit(({ context }) => ({
          type: 'cycleCompleted',
          data: {
            cycleCount: context.cycleCount,
            virtualNodes: context.virtualNodes,
          },
        })),
      ],
      always: 'spawning',
    },
  },
}).provide({
  actions: {
    updateHits: assign(({ context, event }) => {
      const hits = [
        {
          pos: event.pos,
          completedAt: performance.now(),
          expired: false,
        },
        ...context.hits.map(hit => ({ ...hit, expired: true })),
      ];

      // remove hits older than 5 seconds
      const now = performance.now();
      const fiveSecondsAgo = now - 5000;
      const filteredHits = hits.filter(hit => hit.completedAt > fiveSecondsAgo);

      return {
        hits: filteredHits,
      };
    }),
    pauseParticles: assign(() => ({
      lastTickTime: null,
    })),
    updateContext: assign(({ context, event }) => ({
      ...context,
      ...event.payload,
    })),
    spawnParticles: assign(({ context, spawn, self }) => {
      const requests = context.userRequests || [];
      const particlesConfig = requests.map((reqData, index) => ({
        parentRef: self,
        id: reqData.key,
        key: index,
        ringStartPos: reqData.position,
        ringEndPos: findTargetNode(context.virtualNodes, reqData.position).position,
        dimensions: context.dimensions,
        speed: context.speed,
      }));

      const particleRefs = particlesConfig.map(particleConfig =>
        spawn(particleMachine, {
          id: `particle-${particleConfig.id}`,
          input: particleConfig,
        })
      );

      return {
        particleRefs,
        hits: context.hits,
      };
    }),
    incrementCycleCount: assign({
      cycleCount: ({ context }) => context.cycleCount + 1,
    }),
    forwardTickToParticles: ({ context, event }) => {
      const lastTickTime = context.lastTickTime || event.time - 16.667; // 1 frame ago if we don't have a lastTickTime
      context.particleRefs
        .filter(p => p.getSnapshot().status !== 'done')
        .forEach(({ ref }) => {
          ref.send({ ...event, deltaTime: event.time - lastTickTime });
        });

      return {
        ...context,
        lastTickTime: event.time,
      };
    },
  },
  guards: {
    allParticlesCompleted: ({ context }) =>
      context.particleRefs.every(p => p.getSnapshot().status === 'done'),
  },
});

function findTargetNode(nodesSorted, keyPos) {
  for (let i = 0; i < nodesSorted.length; i++) {
    if (keyPos <= nodesSorted[i].position) {
      return nodesSorted[i];
    }
  }
  // If none in the middle, it wraps around to the first node.
  return nodesSorted[0];
}
