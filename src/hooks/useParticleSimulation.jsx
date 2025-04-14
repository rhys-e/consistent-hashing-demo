import { useRef, useEffect, useCallback } from 'react';
import { useMachine } from '@xstate/react';
import { simulationMachine } from '../state/machines';
import { PARTICLE_SPEED } from '../constants/state';

export function useParticleSimulation({
  userRequests,
  virtualNodes,
  speedMultiplier,
  onUserRequestCompleted,
  onCycleCompleted,
}) {
  const [snapshot, send, ref] = useMachine(simulationMachine, {
    input: {
      speed: { particleSpeed: PARTICLE_SPEED, speedMultiplier },
      userRequests,
      virtualNodes,
    },
  });

  const requestRef = useRef(null);

  useEffect(() => {
    const subscriptions = [];
    subscriptions.push(ref.on('particleCompleted', event => onUserRequestCompleted(event)));
    subscriptions.push(ref.on('cycleCompleted', event => onCycleCompleted(event)));
    return () => subscriptions.forEach(subscription => subscription.unsubscribe());
  }, [ref, onUserRequestCompleted, onCycleCompleted]);

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
    hitsToRender: snapshot.context.hits,
    particleRefs: snapshot.context.particleRefs,
    start,
    pause,
    resume,
    update,
  };
}
