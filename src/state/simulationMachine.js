import { createMachine, assign } from 'xstate';
import { createParticleMachine } from './particleMachine';

export const simulationMachine = initialProps =>
  createMachine({
    id: 'simulation',
    initial: 'idle',
    context: () => ({
      cycleCount: 0,
      particleRefs: [],
      hits: [],
      ringNodes: initialProps.ringNodes,
      fixedRequests: initialProps.fixedRequests,
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
            target: 'running',
          },
        },
      },
      running: {
        entry: ['spawnParticles', 'sortRingNodes'],
        on: {
          TICK: {
            actions: 'forwardTickToParticles',
          },
          PARTICLE_DONE: [
            {
              target: 'cycleComplete',
              guard: 'isLastParticle',
              actions: 'markOneParticleDone',
            },
            {
              actions: 'markOneParticleDone',
            },
          ],
          PAUSE: {
            target: 'idle',
          },
        },
      },
      cycleComplete: {
        entry: 'incrementCycleCount',
        always: 'running',
      },
    },
  }).provide({
    actions: {
      updateContext: assign(({ context, event }) => {
        return {
          ...context,
          ...event.payload,
        };
      }),
      sortRingNodes: assign(({ context }) => {
        return {
          ringNodes: context.ringNodes.sort((a, b) => a.position - b.position),
        };
      }),
      spawnParticles: assign(({ context, spawn }) => {
        function findResponsibleNode(nodesSorted, keyPos) {
          for (let i = 0; i < nodesSorted.length; i++) {
            if (keyPos <= nodesSorted[i].position) {
              return nodesSorted[i];
            }
          }
          // If none in the middle, it wraps around to the first node.
          return nodesSorted[0];
        }

        const requests = context.fixedRequests || [];
        const newParticleRefs = requests.map(reqData => {
          // create a child machine
          const responsible = findResponsibleNode(context.ringNodes, reqData.position);
          const particleMachine = createParticleMachine({
            id: reqData.id,
            spawnPos: reqData.position,
            targetPos: responsible.position,
            SVG_WIDTH: initialProps.SVG_WIDTH,
            SVG_HEIGHT: initialProps.SVG_HEIGHT,
            SVG_RADIUS: initialProps.SVG_RADIUS,
            PARTICLE_SPEED: initialProps.PARTICLE_SPEED,
            speedMultiplier: initialProps.speedMultiplier,
          });

          const actorRef = spawn(particleMachine, { id: `particle-${reqData.id}` });

          return {
            ref: actorRef,
            particleId: reqData.id,
          };
        });

        return {
          particleRefs: newParticleRefs,
          hits: [],
        };
      }),
      markOneParticleDone: assign(({ context: ctx, event }) => {
        const updatedRefs = ctx.particleRefs.filter(p => p.particleId !== event.particleId);
        return {
          particleRefs: updatedRefs,
          hits: [
            {
              id: event.particleId,
              timestamp: Date.now(),
            },
            ...ctx.hits,
          ],
        };
      }),
      incrementCycleCount: assign({
        cycleCount: ({ context }) => context.cycleCount + 1,
      }),
      forwardTickToParticles: (ctx, event) => {
        ctx.particleRefs.forEach(({ ref }) => {
          ref.send(event);
        });
      },
    },
    guards: {
      isLastParticle: ({ context, event }) =>
        context.particleRefs.length === 1 &&
        context.particleRefs[0].particleId === event.particleId,
    },
  });
