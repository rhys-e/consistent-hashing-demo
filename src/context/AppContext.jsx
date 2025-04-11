import React, { createContext, useContext } from 'react';
import { useExecutionStatus } from '../hooks/useExecutionStatus';
import { useStore } from '../hooks/useStore';
import { consoleLogStore, serversStore, dimensionsStore } from '../state/stores';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Re-expose hooks
  const executionStatus = useExecutionStatus();
  const logs = useStore(consoleLogStore);
  const servers = useStore(serversStore);
  const dimensions = useStore(dimensionsStore);

  const addLog = (message, type = 'info') => {
    consoleLogStore.trigger.add({ message, type, maxLogCount: 200 });
  };

  const clearLogs = () => {
    consoleLogStore.trigger.clear();
  };

  const value = {
    // Execution Status
    ...executionStatus,

    // Logging
    logs,
    addLog,
    clearLogs,

    // Stores
    servers,
    dimensions,
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
