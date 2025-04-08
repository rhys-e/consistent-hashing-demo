import { useRef, useEffect } from 'react';
import { STATE_MACHINE } from '../utils/stateUtils';
import { useHashCache } from './useHashCache';
import { useMachine } from '@xstate/react';
import { simulationMachine } from '../state/simulationMachine';

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
  const { hashCache: fixedRequests } = useHashCache({ cacheSize: numRequests, seedNumber: 1000 });

  const [snapshot, send, ref] = useMachine(simulationMachine, {
    input: {
      dimensions: dimensions,
      speed: { particleSpeed: PARTICLE_SPEED, speedMultiplier },
      fixedRequests,
      ringNodes: Object.values(ringNodes),
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
    return () => {
      subscription.unsubscribe();
    };
  }, [ref, requestCompletedCallback, snapshot.context.renderNodes]);

  useEffect(() => {
    let payload = { fixedRequests, ringNodes: Object.values(ringNodes), dimensions };
    if (runningState === STATE_MACHINE.INIT) {
      payload.renderNodes = Object.values(ringNodes);
    }
    send({
      type: 'UPDATE',
      payload,
    });
  }, [send, fixedRequests, ringNodes, dimensions, runningState]);

  // Effect to start the simulation
  useEffect(() => {
    function animate(time) {
      requestRef.current = requestAnimationFrame(animate);
      send({ type: 'TICK', time });
    }

    if (runningState === STATE_MACHINE.RUNNING) {
      if (!requestRef.current) {
        send({ type: 'START' });
        animate(performance.now());
      } else {
        send({ type: 'RESUME' });
        animate(performance.now());
      }
    } else if (runningState === STATE_MACHINE.PAUSED) {
      send({ type: 'PAUSE' });
      cancelAnimationFrame(requestRef.current);
    }

    return () => {
      cancelAnimationFrame(requestRef.current);
    };
  }, [send, runningState]);

  return {
    pCurPos: snapshot.context.pCurPos,
    pRingInitialPos: snapshot.context.pRingInitialPos,
    hitsToRender: snapshot.context.hits,
    renderNodes: snapshot.context.renderNodes,
  };
}
