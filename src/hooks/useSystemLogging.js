import { useEffect } from 'react';
import { useAtom, useSelector } from './useStore';
import { serversStore } from '../state/serversStore';
import { useExecutionStatus, EXECUTION_STATES } from './useExecutionStatus';
import { vnodeCountAtom } from '../state/vnodeCountAtom';
import { consoleLogStore } from '../state/consoleLogStore';

export const useSystemLogging = () => {
  const { logs } = useSelector(consoleLogStore);
  const { executionStatus } = useExecutionStatus();
  const { servers } = useSelector(serversStore);
  const vnodeCount = useAtom(vnodeCountAtom);

  const addLog = (message, type = 'info') => {
    consoleLogStore.trigger.add({ message, msgType: type, maxLogCount: 200 });
  };

  const clearLogs = () => {
    consoleLogStore.trigger.clear();
  };

  useEffect(() => {
    const serverStoreSubscription = serversStore.subscribe(snapshot => {
      if (snapshot.context.event?.type === 'add') {
        addLog(`Added new server: ${snapshot.context.event.payload.id}`, 'info');
      }

      if (snapshot.context.event?.type === 'remove') {
        addLog(`Removed server: ${snapshot.context.event.payload}`, 'warning');
      }

      if (snapshot.context.event?.type === 'reset') {
        console.log('reset');
        addLog('System reset to initial state', 'info');
      }
    });
    return serverStoreSubscription.unsubscribe;
  }, []);

  // Log server changes
  useEffect(() => {
    if (servers.length > 0 && executionStatus === EXECUTION_STATES.RUNNING) {
      addLog(`Server configuration updated: ${servers.length} nodes active`, 'info');
    }
  }, [servers, executionStatus]);

  // Log vnode count changes
  useEffect(() => {
    if (executionStatus === EXECUTION_STATES.RUNNING) {
      addLog(`Virtual node count set to ${vnodeCount}`, 'info');
    }
  }, [vnodeCount, executionStatus]);

  // Log execution status changes
  useEffect(() => {
    if (executionStatus === EXECUTION_STATES.RUNNING) {
      addLog('Simulation started', 'info');
    } else if (executionStatus === EXECUTION_STATES.PAUSED) {
      addLog('Simulation paused', 'info');
    } else if (executionStatus === EXECUTION_STATES.STOPPED) {
      addLog('Simulation stopped', 'info');
    }
  }, [executionStatus]);

  return { logs, addLog, clearLogs };
};
