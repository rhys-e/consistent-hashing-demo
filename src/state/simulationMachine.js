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
    }),
    states: {
      idle: {
        on: {
          START: {
            target: 'running',
          },
        },
      },
      running: {
        entry: 'spawnParticles',
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
      spawnParticles: assign(({ spawn }) => {
        const requests = initialProps.fixedRequests || [];
        const newParticleRefs = requests.map(reqData => {
          // create a child machine
          const particleMachine = createParticleMachine({
            id: reqData.id,
            spawnPos: reqData.position,
            targetPos: reqData.targetPos,
            SVG_WIDTH: initialProps.SVG_WIDTH,
            SVG_HEIGHT: initialProps.SVG_HEIGHT,
            SVG_RADIUS: initialProps.SVG_RADIUS,
            PARTICLE_SPEED: initialProps.PARTICLE_SPEED,
            speedMultiplier: initialProps.speedMultiplier,
          });

          // spawn the actor with a system ID
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
