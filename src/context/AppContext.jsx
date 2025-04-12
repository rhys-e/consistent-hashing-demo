import { createContext, useContext, useEffect, useCallback } from 'react';
import { useExecutionStatus } from '../hooks/useExecutionStatus';
import { useSelector, useAtom } from '../hooks/useStore';
import { consoleLogStore, serversStore, dimensionsStore, statsStore } from '../state/stores';
import { vnodeCountAtom, speedMultiplierAtom, numRequestsAtom } from '../state/atoms';
import { EXECUTION_STATES } from '../hooks/useExecutionStatus';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Re-expose hooks
  const executionStatus = useExecutionStatus();
  const logsContext = useSelector(consoleLogStore);
  const { event: serversEvent, servers } = useSelector(serversStore);
  const dimensions = useSelector(dimensionsStore);
  const { nodeStats, loadImbalance } = useSelector(statsStore);

  // Re-expose atoms
  const vnodeCount = useAtom(vnodeCountAtom);
  const speedMultiplier = useAtom(speedMultiplierAtom);
  const numRequests = useAtom(numRequestsAtom);

  const addLog = useCallback((message, type = 'info') => {
    consoleLogStore.trigger.add({ message, msgType: type, maxLogCount: 200 });
  }, []);

  const clearLogs = () => {
    consoleLogStore.trigger.clear();
  };

  useEffect(() => {
    // Log server changes
    if (serversEvent?.type === 'add') {
      addLog(`Added new server: ${serversEvent.payload.id}`, 'info');
    }

    if (serversEvent?.type === 'remove') {
      addLog(`Removed server: ${serversEvent.payload}`, 'warning');
    }
  }, [serversEvent, addLog]);

  useEffect(() => {
    // Log server changes
    if (servers.length > 0 && executionStatus.executionStatus === EXECUTION_STATES.RUNNING) {
      addLog(`Server configuration updated: ${servers.length} nodes active`, 'info');
    }
  }, [servers, executionStatus.executionStatus, addLog]);

  useEffect(() => {
    // Log vnode count changes
    if (executionStatus.executionStatus === EXECUTION_STATES.RUNNING) {
      addLog(`Virtual node count set to ${vnodeCount}`, 'info');
    }
  }, [executionStatus.executionStatus, vnodeCount, addLog]);

  useEffect(() => {
    // Log execution status changes
    if (executionStatus.executionStatus === EXECUTION_STATES.RUNNING) {
      addLog('Simulation started', 'info');
    } else if (executionStatus.executionStatus === EXECUTION_STATES.PAUSED) {
      addLog('Simulation paused', 'info');
    } else if (executionStatus.executionStatus === EXECUTION_STATES.STOPPED) {
      addLog('Simulation stopped', 'info');
    }
  }, [executionStatus.executionStatus, addLog]);

  const value = {
    // Execution Status
    execution: {
      ...executionStatus,
    },

    // Logging
    logging: {
      logs: logsContext.logs,
      addLog,
      clearLogs,
    },

    // Stores
    stores: {
      servers,
      dimensions,
      stats: {
        nodeStats,
        loadImbalance,
      },
    },

    // Atoms
    atoms: {
      vnodeCount,
      speedMultiplier,
      numRequests,
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
