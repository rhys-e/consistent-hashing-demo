import { useRef, useEffect, useCallback } from 'react';
import { useMachine } from '@xstate/react';
import { simulationMachine } from '../state/machines';
import { PARTICLE_SPEED } from '../constants/state';

export function useParticleSimulation({
  userRequests,
  virtualNodes,
  speedMultiplier,
  requestCompletedCallback,
  reroutedCallback,
  dimensions,
}) {
  const [snapshot, send, ref] = useMachine(simulationMachine, {
    input: {
      dimensions,
      speed: { particleSpeed: PARTICLE_SPEED, speedMultiplier },
      userRequests,
      virtualNodes,
    },
  });

  const requestRef = useRef(null);

  useEffect(() => {
    const subscription = ref.on('particleCompleted', event => {
      const targetNode = snapshot.context.renderNodes.find(
        node => node.position === event.data.ringEndPos
      );
      requestCompletedCallback(targetNode, event);
    });
    return subscription.unsubscribe;
  }, [ref, requestCompletedCallback, snapshot.context.renderNodes]);

  const animate = useCallback(
    time => {
      send({ type: 'TICK', time });
      requestRef.current = requestAnimationFrame(animate);
    },
    [send]
  );

  const start = useCallback(() => {
    send({ type: 'START' });
    animate(performance.now());
  }, [send, animate]);

  const pause = useCallback(() => {
    send({ type: 'PAUSE' });
    cancelAnimationFrame(requestRef.current);
  }, [send]);

  const resume = useCallback(() => {
    send({ type: 'RESUME' });
    animate(performance.now());
  }, [send, animate]);

  const update = useCallback(
    payload => {
      send({ type: 'UPDATE', payload });
    },
    [send]
  );

  return {
    pCurPos: snapshot.context.pCurPos,
    pRingInitialPos: snapshot.context.pRingInitialPos,
    hitsToRender: snapshot.context.hits,
    renderNodes: snapshot.context.renderNodes,
    particleRefs: snapshot.context.particleRefs,
    start,
    pause,
    resume,
    update,
  };
}
