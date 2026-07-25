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
    if (state.value === EXECUTION_STATES.STOPPED) {
      start();
    } else if (state.value === EXECUTION_STATES.RUNNING) {
      pause();
    } else if (state.value === EXECUTION_STATES.PAUSED) {
      resume();
    }
  };

  useEffect(() => {
    let snapshot = ref.getSnapshot();
    const subscription = ref.subscribe(state => {
      onExecutionStatusChange?.(
        {
          prevExecutionStatus: snapshot.value,
          newExecutionStatus: state.value,
        },
        EXECUTION_STATES
      );
      snapshot = ref.getSnapshot();
    });
    return subscription.unsubscribe;
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
