import { createMachine, assign, sendTo } from 'xstate';
export const particleMachine = createMachine({
  id: 'particle',
  initial: 'initial',
  context: ({ input }) => ({
    id: input.id,
    parentRef: input.parentRef,
    speed: input.speed,
    initialFrames: 0,
    ringFrames: 0,
    ringStartPos: input.ringStartPos,
    ringEndPos: input.ringEndPos,
    currentPos: input.ringStartPos,
    initialAnimationProgress: 0,
  }),
  states: {
    initial: {
      on: {
        TICK: [
          {
            target: 'ring',
            guard: 'isInitialAnimationDone',
          },
          {
            actions: 'incrementInitialAnimationProgress',
          },
        ],
      },
    },
    ring: {
      on: {
        TICK: [
          {
            target: 'completed',
            guard: 'isTargetReached',
          },
          {
            actions: [
              {
                type: 'incrementRingAnimationProgress',
                params: {
                  epsilon: 1e-8,
                },
              },
            ],
          },
        ],
      },
    },
    completed: {
      type: 'final',
      entry: sendTo(
        ({ context }) => context.parentRef,
        ({ context }) => ({
          type: 'PARTICLE_COMPLETED',
          data: {
            id: context.id,
            ringStartPos: context.ringStartPos,
            ringEndPos: context.ringEndPos,
          },
        })
      ),
    },
  },
}).provide({
  actions: {
    incrementInitialAnimationProgress: assign(({ context: ctx, event }) => {
      if (ctx.initialAnimationProgress < 1) {
        const deltaTime = event.deltaTime;
        const frameAdjustedSpeed =
          ctx.speed.particleSpeed * (deltaTime / 16.667) * ctx.speed.speedMultiplier;
        const initialAnimationSpeed = frameAdjustedSpeed * 5;

        const newProgress = ctx.initialAnimationProgress + initialAnimationSpeed;

        return {
          initialAnimationProgress: newProgress,
          initialFrames: ctx.initialFrames + 1,
        };
      }
    }),
    incrementRingAnimationProgress: assign(({ context: ctx, event }, { epsilon }) => {
      const deltaTime = event.deltaTime;
      const frameAdjustedSpeed =
        ctx.speed.particleSpeed * (deltaTime / 16.667) * ctx.speed.speedMultiplier;

      let nextPos = ctx.currentPos + frameAdjustedSpeed;
      // Wrap around the boundary at 1.0 back to 0.0.
      if (nextPos > 1) nextPos -= 1;

      // Computes the forward distance on a ring from a to b in [0..1).
      // i.e., if b < a, we wrap around the boundary at 1.0 back to 0.0.
      function ringDistance(a, b) {
        return b >= a ? b - a : 1 - a + b;
      }

      // Distance travelled from oldPos to newPos.
      const distTravelled = ringDistance(ctx.currentPos, nextPos);
      // Distance needed from oldPos to targetPos.
      const distNeeded = ringDistance(ctx.currentPos, ctx.ringEndPos);

      const reachedTarget = distTravelled + epsilon >= distNeeded;
      if (!reachedTarget) {
        return {
          currentPos: nextPos,
          ringFrames: ctx.ringFrames + 1,
        };
      } else {
        return {
          currentPos: ctx.ringEndPos,
        };
      }
    }),
  },
  guards: {
    isInitialAnimationDone: ({ context }) => context.initialAnimationProgress >= 1.0,
    isTargetReached: ({ context }) => context.currentPos === context.ringEndPos,
  },
});
