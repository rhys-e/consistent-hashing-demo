import { useEffect } from 'react';
import { useSelector } from './useStore';
import { virtualNodeStore } from '../state/stores/virtualNodeStore';
import { useExecutionStatus, EXECUTION_STATES } from './useExecutionStatus';
import { consoleLogStore } from '../state/stores/consoleLogStore';
import { userRequestStore } from '../state/stores/userRequestStore';

export const useSystemLogging = () => {
  const { logs } = useSelector(consoleLogStore);
  const { executionStatus } = useExecutionStatus();
  const { nodes, numVirtualNodesPerNode } = useSelector(virtualNodeStore);
  const userRequests = useSelector(userRequestStore);

  const addLog = (message, type = 'info') => {
    consoleLogStore.trigger.add({ message, msgType: type, maxLogCount: 200 });
  };

  const clearLogs = () => {
    consoleLogStore.trigger.clear();
  };

  useEffect(() => {
    const nodeAddedSubscription = virtualNodeStore.on('nodeAdded', event => {
      addLog(`Added new server: ${event.payload.node.id}`, 'info');
    });

    const nodeRemovedSubscription = virtualNodeStore.on('nodeRemoved', event => {
      addLog(`Removed server: ${event.payload.id}`, 'warning');
    });

    const nodesChangedSubscription = virtualNodeStore.on('nodesChanged', _event => {
      consoleLogStore.trigger.clear();
      addLog('System reset to initial state', 'info');
    });

    return () => {
      nodeAddedSubscription.unsubscribe();
      nodeRemovedSubscription.unsubscribe();
      nodesChangedSubscription.unsubscribe();
    };
  }, []);

  // Log server changes
  useEffect(() => {
    if (nodes.length > 0 && executionStatus === EXECUTION_STATES.RUNNING) {
      addLog(`Server configuration updated: ${nodes.length} nodes active`, 'info');
    }
  }, [nodes, executionStatus]);

  // Log vnode count changes
  useEffect(() => {
    if (executionStatus === EXECUTION_STATES.RUNNING) {
      addLog(`Virtual node count set to ${numVirtualNodesPerNode}`, 'info');
    }
  }, [numVirtualNodesPerNode, executionStatus]);

  // Log execution status changes
  useEffect(() => {
    if (executionStatus === EXECUTION_STATES.RUNNING) {
      addLog('Simulation started', 'info');
    } else if (executionStatus === EXECUTION_STATES.PAUSED) {
      addLog('Simulation paused', 'info');
    } else if (executionStatus === EXECUTION_STATES.STOPPED) {
      //addLog('Simulation stopped', 'info');
    }
  }, [executionStatus]);

  return { logs, addLog, clearLogs };
};
