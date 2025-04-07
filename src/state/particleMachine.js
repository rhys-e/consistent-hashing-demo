import { createMachine, assign, sendParent } from 'xstate';
import { toXY } from '../utils/geometryUtils';

export const createParticleMachine = initialProps =>
  createMachine({
    id: 'particle',
    initial: 'initial',
    context: () => {
      const [targetX, targetY] = toXY(
        initialProps.spawnPos,
        initialProps.SVG_WIDTH,
        initialProps.SVG_HEIGHT,
        initialProps.SVG_RADIUS
      );
      return {
        id: initialProps.id,
        lastTickTime: null,
        initialFrames: 0,
        ringFrames: 0,
        currentPos: initialProps.spawnPos,
        targetPos: initialProps.targetPos,
        targetNodeId: initialProps.targetNodeId,
        startX: initialProps.SVG_WIDTH / 2,
        startY: initialProps.SVG_HEIGHT / 2,
        endX: targetX,
        endY: targetY,
        currentX: initialProps.SVG_WIDTH / 2,
        currentY: initialProps.SVG_HEIGHT / 2,
        initialAnimationProgress: 0,
        completedAt: null,
      };
    },
    states: {
      initial: {
        entry: assign({
          lastTickTime: Date.now(),
        }),
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
              actions: {
                type: 'incrementRingAnimationProgress',
                params: {
                  epsilon: 1e-8,
                },
              },
            },
          ],
        },
      },
      completed: {
        type: 'final',
        entry: sendParent(ctx => {
          return {
            type: 'PARTICLE_DONE',
            particleId: ctx.id,
          };
        }),
      },
    },
  }).provide({
    actions: {
      incrementInitialAnimationProgress: assign(({ context: ctx, event }) => {
        const updates = {
          lastTickTime: event.time,
        };

        if (ctx.initialAnimationProgress < 1) {
          const deltaTime = event.time - ctx.lastTickTime;
          const frameAdjustedSpeed =
            initialProps.PARTICLE_SPEED * (deltaTime / 16.667) * initialProps.speedMultiplier;
          const initialAnimationSpeed = frameAdjustedSpeed * 10;

          const newProgress = ctx.initialAnimationProgress + initialAnimationSpeed * 0.5;
          // linear interpolation from center to ring
          const t = newProgress;
          const x = ctx.startX + (ctx.endX - ctx.startX) * t;
          const y = ctx.startY + (ctx.endY - ctx.startY) * t;

          updates.currentX = x;
          updates.currentY = y;
          updates.initialAnimationProgress = newProgress;
          updates.initialFrames = ctx.initialFrames + 1;
        }

        return updates;
      }),

      incrementRingAnimationProgress: assign(({ context: ctx, event }, { epsilon }) => {
        const updates = {
          lastTickTime: event.time,
        };

        const deltaTime = event.time - ctx.lastTickTime;
        const frameAdjustedSpeed =
          initialProps.PARTICLE_SPEED * (deltaTime / 16.667) * initialProps.speedMultiplier;

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
        const distNeeded = ringDistance(ctx.currentPos, ctx.targetPos);

        const reachedTarget = distTravelled + epsilon >= distNeeded;
        if (!reachedTarget) {
          updates.currentPos = nextPos;
        } else {
          updates.completedAt = event.time;
          updates.currentPos = ctx.targetPos;
        }

        updates.ringFrames = ctx.ringFrames + 1;
        return updates;
      }),
    },
    guards: {
      isInitialAnimationDone: ({ context }) => context.initialAnimationProgress >= 1.0,
      isTargetReached: ({ context }) => context.currentPos === context.targetPos,
    },
  });
