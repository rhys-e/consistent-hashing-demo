import { createContext, useContext } from 'react';
import { userRequestStore } from '../state/stores/userRequestStore';
import { useExecutionStatus } from '../hooks/useExecutionStatus';
import { useSystemLogging } from '../hooks/useSystemLogging';
import { useSelector } from '../hooks/useStore';

const AppContext = createContext();

export function AppProvider({ children }) {
  const userRequests = useSelector(userRequestStore);
  const executionStatus = useExecutionStatus();
  const systemLogging = useSystemLogging();

  return (
    <AppContext.Provider
      value={{
        userRequests,
        executionStatus,
        systemLogging,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
