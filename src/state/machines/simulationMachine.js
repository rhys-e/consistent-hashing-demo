import { createMachine, assign, emit, enqueueActions } from 'xstate';
import { particleMachine } from './particleMachine';

export const simulationMachine = createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5SwJYFsCuAbAhgFxQHsA7AYgFUAFAEQEEAVAUQG0AGAXUVAAdDUCSXEAA9EANgDMAVgB0AFikTWADmWSJARikAmAOwAaEAE9EG7QF9zh1JlwDiMlBCxhSAZXq0ASvTackILz8RMRCoggaCjIAnLGx2pFyyrpSylKGJgg60TJi0dpicnLaKiqKltbo2Pghjs6uXoxu5ACyLBxCQSj2YaZRcfGJyanpxogSumIy0tESchrRrPkTYhUgNtX2MrDcOADuxCjEUKR+nXzdIb0RrLqsMlK6ykvRUhoS2lJyEhmI2kW5fJiR66ApJKRSNYbOy1ABOGGIh2OpHoAEkAMIAaTOAS6PQC4UeOTmEjET0+t1YrA0vwQEjUMWKZI0ukiK10UKqMJIMnhiKOJzRWOYGn8PAu+NA4Qk9JkykWIOUkS0yh+YwQemU8lYYm0n3y2gk0Tk0U5thqPL5SJOlG8QoAMowAPpUOhMag48XBQQE8a3GSsTSGlnaNKqUaZDTKbTyRQaF7SCEJVZWdZci0OK0C0i28hudpiwISq6+iL9AYJIrDNK00P3OQ6vVSA1Gk1mza1ADGRk7LnRhDQ3BceFcnqL3tCpfjdweTxebw+XzVmXpWqKBSVELyiwsa2IhAgcCE0Iz5wn1wAtDT1caYnGtNE1MpiroOamT1snC4z5cfVLEHIBjqm8xIspIYgQWILKvu23IODs+zWj+koiKYGjArkrLPpIJp3Kw2i0tIEjyEychQZESzRnIsEZryCJIbixZ-qhdKqDIoaLBoCyRDoSjLuMujEs2cwLEshqTDRWzdr2YD9oOw5gMhJb-ggSoaOxJJLrE6EQoRkiMgUurRGSYjJLulhAA */
  id: 'simulation',
  initial: 'idle',
  context: ({ input }) => ({
    cycleCount: 0,
    particleRefs: [],
    virtualNodes: input.virtualNodes,
    userRequests: input.userRequests,
    speed: input.speed,
    lastTickTime: null,
  }),
  on: {
    UPDATE: {
      actions: ['updateContext', 'updateChildContext'],
    },
    PARTICLE_COMPLETED: {
      actions: 'particleCompleted',
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
      on: {
        TICK: {
          target: 'running',
          actions: 'spawnParticles',
        },
      },
    },
    running: {
      on: {
        TICK: [
          {
            guard: 'allParticlesCompleted',
            target: 'cycleComplete',
          },
          {
            actions: 'forwardTickToParticles',
          },
        ],
        PAUSE: {
          target: 'idle',
          actions: 'pauseParticles',
        },
      },
    },
    cycleComplete: {
      entry: ['incrementCycleCount', 'cycleCompleted'],
      always: 'spawning',
    },
  },
}).provide({
  actions: {
    pauseParticles: assign({
      lastTickTime: null,
    }),
    cycleCompleted: emit(({ context }) => ({
      type: 'cycleCompleted',
      data: {
        cycleCount: context.cycleCount,
        virtualNodes: context.virtualNodes,
      },
    })),
    particleCompleted: emit(({ context, event }) => ({
      type: 'particleCompleted',
      data: {
        ...event.data,
        targetNode: findTargetNode(context.virtualNodes, event.data.ringStartPos),
      },
    })),
    updateContext: assign(({ event }) => ({
      ...event.payload,
    })),
    updateChildContext: enqueueActions(({ enqueue, context }) =>
      context.particleRefs
        .filter(ref => ref.getSnapshot().status !== 'done')
        .forEach(ref => {
          enqueue.sendTo(ref, {
            type: 'UPDATE',
            payload: { speed: context.speed },
          });
        })
    ),
    spawnParticles: assign(({ context, spawn, self }) => ({
      particleRefs: context.userRequests.map(reqData =>
        spawn(particleMachine, {
          id: `particle-${reqData.key}`,
          input: {
            parentRef: self,
            id: reqData.key,
            ringStartPos: reqData.position,
            ringEndPos: findTargetNode(context.virtualNodes, reqData.position).position,
            speed: context.speed,
          },
        })
      ),
    })),
    incrementCycleCount: assign({
      cycleCount: ({ context }) => context.cycleCount + 1,
    }),
    forwardTickToParticles: enqueueActions(({ enqueue, context, event }) => {
      context.particleRefs
        .filter(p => p.getSnapshot().status !== 'done')
        .forEach(ref =>
          enqueue.sendTo(ref, {
            type: 'TICK',
            // 1 frame ago if we don't have a lastTickTime
            deltaTime: event.time - (context.lastTickTime || event.time - 16.667),
          })
        );

      enqueue.assign({
        lastTickTime: event.time,
      });
    }),
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
