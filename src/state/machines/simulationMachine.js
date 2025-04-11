import { createMachine, assign, not, enqueueActions } from 'xstate';
import { particleMachine } from './particleMachine';
import { toXY } from '../../utils/geometryUtils';

export const simulationMachine = createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5SwJYFsCuAbAhgFxQHsA7AYgFUAFAEQEEAVAUQG0AGAXUVAAdDUCSXEAA9EANgDMAVgB0AFikTWADmWSJARikAmAOwAaEAE9EG7QF9zh1JlwDiMlBCxhSAZXq0ASvTackILz8RMRCoggaCjIAnLGx2pFyyrpSylKGJgg60TJi0dpicnLaKiqKltbo2Pghjs6uXoxu5ACyLBxCQSj2YaZRcfGJyanpxogSumIy0tESchrRrPkTYhUgNtX2MrDcOADuxCjEUKR+nXzdIb0RrLqsMlK6ykvRUhoS2lJyEhmI2kW5fJiR66ApJKRSNYbOy1ABOGGIh2OpHoAEkAMIAaTOAS6PQC4UeOTmEjET0+t1YrA0vwQEjUMWKZI0ukiK10UKqMJIMnhiKOJzRWOYGn8PAu+NA4Qk9JkykWIOUkS0yh+YwQemU8lYYm0n3y2gk0Tk0U5thqPL5SJOlG8QoAMowAPpUOhMag48XBQQE8a3GSsTSGlnaNKqUaZDTKbTyRQaF7SCEJVZWdZci0OK0C0i28hudpiwISq6+iL9AYJIrDNK00P3OQ6vVSA1Gk1mza1ADGRk7LnRhDQ3BceFcnqL3tCpfjdweTxebw+XzVmXpWqKBSVELyiwsa2IhAgcCE0Iz5wn1wAtDT1caYnGtNE1MpiroOamT1snC4z5cfVLEHIBjqm8xIspIYgQWILKvu23IODs+zWj+koiKYGjArkrLPpIJp3Kw2i0tIEjyEychQZESzRnIsEZryCJIbixZ-qhdKqDIoaLBoCyRDoSjLuMujEs2cwLEshqTDRWzdr2YD9oOw5gMhJb-ggSoaOxJJLrE6EQoRkiMgUurRGSYjJLulhAA */
  id: 'simulation',
  initial: 'idle',
  context: ({ input }) => ({
    cycleCount: 0,
    particleRefs: [],
    hits: [],
    pCurPos: [],
    pRingInitialPos: [],
    dimensions: input.dimensions,
    ringNodes: input.ringNodes,
    fixedRequests: input.fixedRequests,
    speed: input.speed,
    lastTickTime: null,
    renderNodes: input.ringNodes,
  }),
  on: {
    UPDATE: {
      actions: 'updateContext',
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
      entry: ['sortRingNodes', 'spawnParticles'],
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
        PARTICLE_UPDATED: {
          guard: not('allParticlesCompleted'),
          actions: [
            'updateParticles',
            enqueueActions(({ check, enqueue, event, context }) => {
              if (check({ type: 'isParticleCompleted' })) {
                enqueue.emit({
                  type: 'particleCompleted',
                  data: {
                    id: context.pRingInitialPos[event.key].id,
                    ringStartPos: context.pRingInitialPos[event.key].ringStartPos,
                    ringEndPos: event.pos,
                  },
                });
                enqueue('updateHits');
              }
            }),
          ],
        },
        PAUSE: {
          target: 'idle',
          actions: 'pauseParticles',
        },
      },
    },
    cycleComplete: {
      entry: 'incrementCycleCount',
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
    sortRingNodes: assign(({ context }) => ({
      ringNodes: context.ringNodes.sort((a, b) => a.position - b.position),
    })),
    spawnParticles: assign(({ context, spawn, self }) => {
      const requests = context.fixedRequests || [];
      const particlesConfig = requests.map((reqData, index) => {
        return {
          parentRef: self,
          id: reqData.key,
          key: index,
          ringStartPos: reqData.position,
          ringEndPos: findTargetNode(context.ringNodes, reqData.position).position,
          dimensions: context.dimensions,
          center: { x: context.dimensions.SVG_WIDTH / 2, y: context.dimensions.SVG_HEIGHT / 2 },
          speed: context.speed,
        };
      });

      const particleRefs = particlesConfig.map(particleConfig => {
        const actorRef = spawn(particleMachine, {
          id: `particle-${particleConfig.id}`,
          input: particleConfig,
        });
        return {
          ref: actorRef,
          completed: false,
        };
      });

      const pRingInitialPos = particlesConfig.map(particleConfig => {
        const [ringStartX, ringStartY] = toXY(
          particleConfig.ringStartPos,
          context.dimensions.SVG_WIDTH,
          context.dimensions.SVG_HEIGHT,
          context.dimensions.SVG_RADIUS
        );

        return {
          id: particleConfig.id,
          ringStartPos: particleConfig.ringStartPos,
          x: ringStartX,
          y: ringStartY,
        };
      });

      return {
        particleRefs,
        pCurPos: [],
        pRingInitialPos,
        hits: context.hits,
        renderNodes: context.ringNodes,
      };
    }),
    updateParticles: assign(({ context: ctx, event }) => {
      const pCurPos = [...ctx.pCurPos];
      const particleRefs = [...ctx.particleRefs];
      const phase = ctx.particleRefs[event.key].ref.getSnapshot().value;
      particleRefs[event.key].completed = phase === 'completed';

      pCurPos[event.key] = {
        phase,
        pos: event.pos,
        x: event.x,
        y: event.y,
      };

      return {
        pCurPos,
        particleRefs,
      };
    }),
    incrementCycleCount: assign({
      cycleCount: ({ context }) => context.cycleCount + 1,
    }),
    forwardTickToParticles: ({ context, event }) => {
      const lastTickTime = context.lastTickTime || event.time - 16.667; // 1 frame ago if we don't have a lastTickTime
      context.particleRefs
        .filter(p => !p.completed)
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
    allParticlesCompleted: ({ context }) => context.particleRefs.every(p => p.completed),
    isParticleCompleted: ({ context, event }) => context.particleRefs[event.key].completed,
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
