import { createStore } from '@xstate/store';

function newLog(message, type = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
  return {
    id: Date.now() + Math.random().toString(36).substring(7),
    timestamp,
    message,
    type, // 'info', 'success', 'error', 'warning'
  };
}

export const consoleLogStore = createStore({
  context: {
    logs: [newLog('System initialised')],
  },
  on: {
    log: (context, { message, msgType = 'info', maxLogCount = 100 }) => {
      const log = newLog(message, msgType);
      const updatedLogs = [...context.logs, log];
      return {
        ...context,
        logs: updatedLogs.slice(Math.max(0, updatedLogs.length - maxLogCount)),
      };
    },
    clear: () => ({ logs: [] }),
  },
});
