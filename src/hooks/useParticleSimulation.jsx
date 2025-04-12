import { useRef, useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { simulationMachine } from '../state/machines';
import { useExecutionStatus, EXECUTION_STATES } from './useExecutionStatus';
import { userRequestStore } from '../state/stores';
import { useSelector } from './useStore';

const PARTICLE_SPEED = 0.002; // Speed per frame - consistent for all particles

export function useParticleSimulation({
  ringNodes,
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
    if (runningState === EXECUTION_STATES.INIT) {
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

    if (runningState === EXECUTION_STATES.RUNNING) {
      if (!requestRef.current) {
        send({ type: 'START' });
        animate(performance.now());
      } else {
        send({ type: 'RESUME' });
        animate(performance.now());
      }
    } else if (runningState === EXECUTION_STATES.PAUSED) {
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
