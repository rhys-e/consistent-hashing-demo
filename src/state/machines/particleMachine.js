import { createMachine, assign, sendTo } from 'xstate';
import { toXY } from '../../utils/geometryUtils';
export const particleMachine = createMachine({
  id: 'particle',
  initial: 'initial',
  context: ({ input }) => {
    const [ringStartX, ringStartY] = toXY(
      input.ringStartPos,
      input.dimensions.SVG_WIDTH,
      input.dimensions.SVG_HEIGHT,
      input.dimensions.SVG_RADIUS
    );
    return {
      key: input.key,
      parentRef: input.parentRef,
      dimensions: input.dimensions,
      speed: input.speed,
      center: input.center,
      initialFrames: 0,
      ringFrames: 0,
      ringStartPos: input.ringStartPos,
      ringEndPos: input.ringEndPos,
      ringStartX,
      ringStartY,
      currentPos: input.ringStartPos,
      currentX: input.center.x,
      currentY: input.center.y,
      initialAnimationProgress: 0,
    };
  },
  states: {
    initial: {
      on: {
        TICK: [
          {
            target: 'ring',
            guard: 'isInitialAnimationDone',
            actions: 'sendUpdate',
          },
          {
            actions: ['incrementInitialAnimationProgress', 'sendUpdate'],
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
              'sendUpdate',
            ],
          },
        ],
      },
    },
    completed: {
      type: 'final',
      entry: ['sendUpdate'],
    },
  },
}).provide({
  actions: {
    sendUpdate: sendTo(
      ({ context: ctx }) => ctx.parentRef,
      ({ context: ctx }) => {
        return {
          type: 'PARTICLE_UPDATED',
          key: ctx.key,
          pos: ctx.currentPos,
          x: ctx.currentX,
          y: ctx.currentY,
        };
      }
    ),
    incrementInitialAnimationProgress: assign(({ context: ctx, event }) => {
      if (ctx.initialAnimationProgress < 1) {
        const deltaTime = event.deltaTime;
        const frameAdjustedSpeed =
          ctx.speed.particleSpeed * (deltaTime / 16.667) * ctx.speed.speedMultiplier;
        const initialAnimationSpeed = frameAdjustedSpeed * 5;

        const newProgress = ctx.initialAnimationProgress + initialAnimationSpeed;
        // linear interpolation from center to ring
        const t = newProgress;
        const x = ctx.center.x + (ctx.ringStartX - ctx.center.x) * t;
        const y = ctx.center.y + (ctx.ringStartY - ctx.center.y) * t;

        return {
          currentX: x,
          currentY: y,
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
        const [x, y] = toXY(
          nextPos,
          ctx.dimensions.SVG_WIDTH,
          ctx.dimensions.SVG_HEIGHT,
          ctx.dimensions.SVG_RADIUS
        );
        return {
          currentX: x,
          currentY: y,
          currentPos: nextPos,
          ringFrames: ctx.ringFrames + 1,
        };
      } else {
        const [ringEndX, ringEndY] = toXY(
          ctx.ringEndPos,
          ctx.dimensions.SVG_WIDTH,
          ctx.dimensions.SVG_HEIGHT,
          ctx.dimensions.SVG_RADIUS
        );
        return {
          currentPos: ctx.ringEndPos,
          currentX: ringEndX,
          currentY: ringEndY,
        };
      }
    }),
  },
  guards: {
    isInitialAnimationDone: ({ context }) => context.initialAnimationProgress >= 1.0,
    isTargetReached: ({ context }) => context.currentPos === context.ringEndPos,
  },
});
