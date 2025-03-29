import { useState, useCallback } from 'react';

function newLog(message, type = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
  return {
    id: Date.now() + Math.random().toString(36).substring(7),
    timestamp,
    message,
    type, // 'info', 'success', 'error', 'warning'
  };
}

export function useConsoleLog(maxLogCount = 100) {
  const [logs, setLogs] = useState([newLog('System initialised')]);

  const addLog = useCallback(
    (message, type = 'info') => {
      const log = newLog(message, type);

      setLogs(prevLogs => {
        const updatedLogs = [...prevLogs, log];
        return updatedLogs.slice(Math.max(0, updatedLogs.length - maxLogCount));
      });
    },
    [maxLogCount]
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    logs,
    addLog,
    clearLogs,
  };
}
