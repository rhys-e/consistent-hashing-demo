import { useMachine } from '@xstate/react';
import { executionStatusMachine } from '../state/executionStatusMachine';

export const EXECUTION_STATES = {
  INIT: 'init',
  RUNNING: 'running',
  PAUSED: 'paused',
  STOPPED: 'stopped',
};

export const useExecutionStatus = () => {
  const [state, send] = useMachine(executionStatusMachine);

  const start = () => send({ type: 'START' });
  const pause = () => send({ type: 'PAUSE' });
  const resume = () => send({ type: 'RESUME' });
  const stop = () => send({ type: 'STOP' });
  const getState = () => state.value;

  const toggleRunning = () => {
    const currentState = getState();
    console.log('currentState', currentState);
    if (currentState === EXECUTION_STATES.STOPPED) {
      start();
    } else if (currentState === EXECUTION_STATES.RUNNING) {
      pause();
    } else if (currentState === EXECUTION_STATES.PAUSED) {
      resume();
    }
  };

  return {
    start,
    pause,
    resume,
    stop,
    getState,
    toggleRunning,
  };
};
