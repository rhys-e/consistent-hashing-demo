import { useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { executionStatusMachine } from '../state/machines';

export const EXECUTION_STATES = {
  INIT: 'init',
  RUNNING: 'running',
  PAUSED: 'paused',
  STOPPED: 'stopped',
};

export const useExecutionStatus = ({ onExecutionStatusChange } = {}) => {
  const [state, send, ref] = useMachine(executionStatusMachine);

  const start = () => send({ type: 'START' });
  const pause = () => send({ type: 'PAUSE' });
  const resume = () => send({ type: 'RESUME' });
  const stop = () => send({ type: 'STOP' });

  const toggleExecutionStatus = () => {
    console.log('executionStatus', state.value);
    if (state.value === EXECUTION_STATES.STOPPED) {
      start();
    } else if (state.value === EXECUTION_STATES.RUNNING) {
      pause();
    } else if (state.value === EXECUTION_STATES.PAUSED) {
      resume();
    }
  };

  useEffect(() => {
    const subscription = ref.subscribe(state => {
      console.log('state', state);
      onExecutionStatusChange?.(state.value, EXECUTION_STATES);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [ref, onExecutionStatusChange]);

  return {
    start,
    pause,
    resume,
    stop,
    value: state.value,
    toggleExecutionStatus,
  };
};
