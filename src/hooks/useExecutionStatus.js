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
  const executionStatus = state.value;

  const toggleRunning = () => {
    console.log('executionStatus', executionStatus);
    if (executionStatus === EXECUTION_STATES.STOPPED) {
      start();
    } else if (executionStatus === EXECUTION_STATES.RUNNING) {
      pause();
    } else if (executionStatus === EXECUTION_STATES.PAUSED) {
      resume();
    }
  };

  return {
    start,
    pause,
    resume,
    stop,
    executionStatus,
    toggleRunning,
  };
};
