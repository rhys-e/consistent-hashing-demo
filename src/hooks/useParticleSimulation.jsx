import { useRef, useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { simulationMachine } from '../state/machines';
import { useExecutionStatus, EXECUTION_STATES } from './useExecutionStatus';
import { userRequestStore } from '../state/stores';
import { useSelector } from './useStore';

const PARTICLE_SPEED = 0.002; // Speed per frame - consistent for all particles

export function useParticleSimulation({
  virtualNodes,
  speedMultiplier,
  requestCompletedCallback,
  reroutedCallback,
  dimensions,
  numRequests,
}) {
  const { executionStatus } = useExecutionStatus();
  const { hashCache: fixedRequests } = useSelector(userRequestStore);
  const runningState = executionStatus;

  const [snapshot, send, ref] = useMachine(simulationMachine, {
    input: {
      dimensions,
      speed: { particleSpeed: PARTICLE_SPEED, speedMultiplier },
      fixedRequests,
      virtualNodes: Object.values(virtualNodes),
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
    let payload = { fixedRequests, virtualNodes: Object.values(virtualNodes), dimensions };
    if (runningState === EXECUTION_STATES.INIT) {
      payload.renderNodes = Object.values(virtualNodes);
    }
    send({
      type: 'UPDATE',
      payload,
    });
  }, [send, fixedRequests, virtualNodes, dimensions, runningState]);

  const animate = time => {
    send({ type: 'TICK', time });
    requestRef.current = requestAnimationFrame(animate);
  };

  const start = () => {
    send({ type: 'START' });
    animate(performance.now());
  };

  const pause = () => {
    send({ type: 'PAUSE' });
    cancelAnimationFrame(requestRef.current);
  };

  const resume = () => {
    send({ type: 'RESUME' });
    animate(performance.now());
  };

  return {
    pCurPos: snapshot.context.pCurPos,
    pRingInitialPos: snapshot.context.pRingInitialPos,
    hitsToRender: snapshot.context.hits,
    renderNodes: snapshot.context.renderNodes,
    start,
    pause,
    resume,
  };
}
