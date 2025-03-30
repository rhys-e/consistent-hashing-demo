import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { toXY } from '../utils/geometryUtils';
import { ANIMATION_PHASE, STATE_MACHINE } from '../utils/stateUtils';
import { useHashCache } from './useHashCache';

const PARTICLE_SPEED = 0.002; // Speed per frame - consistent for all particles

export function useParticleSimulation({
  runningState,
  ringNodes,
  speedMultiplier,
  requestCompletedCallback,
  reroutedCallback,
  dimensions,
  numRequests,
}) {
  const { SVG_WIDTH, SVG_HEIGHT, SVG_RADIUS } = dimensions;

  const [particles, setParticles] = useState([]);
  const [hitsToRender, setHitsToRender] = useState([]);
  const [rerouteFlag, setRerouteFlag] = useState(false);
  const requestRef = useRef(null);
  const lastTimeRef = useRef(0);

  const { hashCache: fixedRequests } = useHashCache({ cacheSize: numRequests, seedNumber: 1000 });

  const sortedRingNodes = useMemo(() => {
    return Object.values(ringNodes).sort((a, b) => a.position - b.position);
  }, [ringNodes]);

  // Spawn a particle when a preview session is ready
  const spawnParticles = useCallback(() => {
    console.log('Spawning particles:', fixedRequests);
    const newParticles = fixedRequests.map(p => {
      const responsible = findResponsibleNode(sortedRingNodes, p.initialPos);

      const newParticle = {
        ...p,
        currentPos: p.initialPos,
        targetPos: responsible.position,
        targetNodeId: responsible.id,
        pathProgress: 0,
        phase: ANIMATION_PHASE.INITIAL,
        completed: false,
        rerouted: false,
        currentX: null,
        currentY: null,
      };

      return newParticle;
    });

    setParticles(newParticles);
  }, [fixedRequests, sortedRingNodes]);

  const animateParticles = useCallback(
    time => {
      const deltaTime = time - (lastTimeRef.current ? lastTimeRef.current : time - 16.667);
      lastTimeRef.current = time;

      const frameAdjustedSpeed = PARTICLE_SPEED * (deltaTime / 16.667) * speedMultiplier;
      const initialAnimationSpeed = frameAdjustedSpeed * 10;

      setParticles(prev => {
        if (prev.length === 0) return prev;

        const updated = prev.map(particle => {
          if (
            particle.phase === ANIMATION_PHASE.POST_COMPLETED ||
            particle.phase === ANIMATION_PHASE.COMPLETED
          ) {
            return particle;
          }

          const nextState = calculateNextParticleState(
            particle,
            frameAdjustedSpeed,
            initialAnimationSpeed,
            SVG_WIDTH,
            SVG_HEIGHT,
            SVG_RADIUS,
            hasReachedTarget
          );
          if (nextState === null) {
            return {
              ...particle,
              completedAt: time,
              phase: ANIMATION_PHASE.COMPLETED,
            };
          }
          return { ...particle, ...nextState };
        });

        return updated;
      });

      // Continue animation loop
      if (runningState === STATE_MACHINE.RUNNING && requestRef.current !== null) {
        requestRef.current = requestAnimationFrame(newTime => {
          animateParticles(newTime);
        });
      }
    },
    [speedMultiplier, runningState, SVG_WIDTH, SVG_HEIGHT, SVG_RADIUS]
  );

  useEffect(() => {
    const completed = particles.filter(p => p.phase === ANIMATION_PHASE.COMPLETED);

    if (completed.length > 0) {
      setHitsToRender(completed);
      requestCompletedCallback(completed);

      setParticles(prev =>
        prev.map(p =>
          p.phase === ANIMATION_PHASE.COMPLETED
            ? { ...p, phase: ANIMATION_PHASE.POST_COMPLETED }
            : p
        )
      );
    } else {
      const allPostCompleted =
        particles.length > 0 && particles.every(p => p.phase === ANIMATION_PHASE.POST_COMPLETED);
      if (allPostCompleted && runningState === STATE_MACHINE.RUNNING) {
        console.log('useEffect: spawn particles');
        spawnParticles();
      }
    }
  }, [particles, runningState, requestCompletedCallback, spawnParticles]);

  // Handle animation start/stop
  useEffect(() => {
    if (runningState === STATE_MACHINE.RUNNING) {
      if (requestRef.current === null) {
        // start animation
        console.log('Starting animation');
        requestRef.current = requestAnimationFrame(time => {
          spawnParticles();
          animateParticles(time);
        });
      } else {
        // resume animation
        console.log('Resuming animation');
        lastTimeRef.current = 0;
        requestRef.current = requestAnimationFrame(time => {
          animateParticles(time);
        });
      }
    } else if (runningState === STATE_MACHINE.PAUSED) {
      // Stop animation loop
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    }

    // Cleanup on unmount
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animateParticles, runningState, spawnParticles]);

  // Effect to reroute particles after node changes
  useEffect(() => {
    console.log('Rerouting particles');
    setParticles(prev =>
      prev.map(particle => {
        const responsible = findResponsibleNode(sortedRingNodes, particle.initialPos);
        if (particle.targetNodeId !== responsible.id) {
          return {
            ...particle,
            oldTargetPos: particle.targetPos,
            oldTargetNodeId: particle.targetNodeId,
            targetPos: responsible.position,
            targetNodeId: responsible.id,
            rerouted: true,
          };
        }
        return particle;
      })
    );
    setRerouteFlag(true);
  }, [sortedRingNodes]);

  useEffect(() => {
    if (rerouteFlag) {
      const reroutedParticles = particles.filter(particle => particle.rerouted);
      if (reroutedParticles.length > 0) {
        reroutedCallback(reroutedParticles);
      }
      setRerouteFlag(false);
      setParticles(prev => prev.map(p => ({ ...p, rerouted: false })));
    }
  }, [rerouteFlag, particles, reroutedCallback]);

  return {
    particles,
    hitsToRender,
  };
}

/**
 * Returns true if, when moving "forward" on a [0..1) ring from oldPos to newPos,
 * you have passed (or landed on) targetPos. The optional epsilon guards against
 * small floating-point errors or skipping the target on discrete updates.

 * hasReachedTarget(0.2, 0.25, 0.23) // true
 * hasReachedTarget(0.9, 0.05, 0.01) // true (wrap-around)
 */
function hasReachedTarget(oldPos, newPos, targetPos, epsilon = 1e-8) {
  // Computes the forward distance on a ring from a to b in [0..1).
  // i.e., if b < a, we wrap around the boundary at 1.0 back to 0.0.
  function ringDistance(a, b) {
    return b >= a ? b - a : 1 - a + b;
  }

  // Distance travelled from oldPos to newPos.
  const distTravelled = ringDistance(oldPos, newPos);
  // Distance needed from oldPos to targetPos.
  const distNeeded = ringDistance(oldPos, targetPos);

  return distTravelled + epsilon >= distNeeded;
}

function calculateNextParticleState(
  particle,
  frameAdjustedSpeed,
  initialAnimationSpeed,
  SVG_WIDTH,
  SVG_HEIGHT,
  SVG_RADIUS,
  hasReachedTargetFn
) {
  if (particle.phase === ANIMATION_PHASE.INITIAL) {
    // Handle initial animation from center to ring position
    const [targetX, targetY] = toXY(particle.currentPos, SVG_WIDTH, SVG_HEIGHT, SVG_RADIUS);

    const newProgress = (particle.pathProgress || 0) + initialAnimationSpeed * 0.5;

    if (newProgress >= 1) {
      // Reached the ring position - transition to normal movement
      return {
        ...particle,
        phase: ANIMATION_PHASE.RING,
        currentPos: particle.currentPos,
        pathProgress: null,
      };
    } else {
      // Move along a straight line from center to ring position
      const t = newProgress;

      // Start point (center)
      const startX = SVG_WIDTH / 2;
      const startY = SVG_HEIGHT / 2;

      // End point (on ring)
      const endX = targetX;
      const endY = targetY;

      // Linear interpolation
      const x = startX + (endX - startX) * t;
      const y = startY + (endY - startY) * t;

      return {
        ...particle,
        currentX: x,
        currentY: y,
        pathProgress: newProgress,
      };
    }
  } else {
    let nextPos = particle.currentPos + frameAdjustedSpeed;
    if (nextPos > 1) nextPos -= 1;
    const reachedTarget = hasReachedTargetFn(particle.currentPos, nextPos, particle.targetPos);

    if (!reachedTarget) {
      return { ...particle, currentPos: nextPos };
    } else {
      return null;
    }
  }
}

// Given a hashed key in [0..1), find the responsible node using "next clockwise node" rule.
function findResponsibleNode(nodesSorted, keyPos) {
  for (let i = 0; i < nodesSorted.length; i++) {
    if (keyPos <= nodesSorted[i].position) {
      return nodesSorted[i];
    }
  }
  // If none in the middle, it wraps around to the first node.
  return nodesSorted[0];
}
