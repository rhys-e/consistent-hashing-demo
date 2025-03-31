import React, { useRef, useEffect, useState } from 'react';
import { ToggleIcon } from './ToggleIcon';
export function ConsoleLog({ logs, collapsed, togglePanel }) {
  const consoleRef = useRef(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);

  // Handle scroll events to detect if user is at bottom
  const handleScroll = () => {
    if (consoleRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = consoleRef.current;
      // Consider "at bottom" if within 20px of the bottom
      const atBottom = scrollHeight - scrollTop - clientHeight < 20;
      setIsScrolledToBottom(atBottom);
    }
  };

  // Auto-scroll to bottom when new logs are added only if already at bottom
  useEffect(() => {
    if (consoleRef.current && !collapsed && isScrolledToBottom) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs, collapsed, isScrolledToBottom]);

  const getLogTypeStyles = type => {
    switch (type) {
      case 'success':
        return 'text-ui-text-success';
      case 'error':
        return 'text-ui-text-error';
      case 'warning':
        return 'text-ui-text-warning';
      default:
        return 'text-ui-text-bright';
    }
  };

  return (
    <div className={`rounded-sm border border-cyber-border bg-panel-bg p-6`}>
      <div className="panel-header" onClick={togglePanel}>
        <h3 className="panel-title panel-title-with-dot panel-title-with-dot-console text-heading-color">
          System Console
        </h3>
        <div className="panel-toggle flex items-center justify-center">
          <ToggleIcon isExpanded={!collapsed} size={12} />
        </div>
      </div>

      <div
        className={`panel-content ${collapsed ? 'panel-content-collapsed' : 'panel-content-expanded'}`}
      >
        <div
          ref={consoleRef}
          className="console-scrollbar mt-4 h-console overflow-y-auto whitespace-pre-wrap break-words border border-cyber-border bg-dark-cyber bg-opacity-90 p-3 font-mono text-[0.7rem]"
          onScroll={handleScroll}
        >
          {logs.map(log => (
            <div key={log.id} className="console-line mb-1">
              <span className="text-ui-text-secondary">[{log.timestamp}]</span>{' '}
              <span className={getLogTypeStyles(log.type)}>{log.message}</span>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="italic text-ui-text-secondary">
              // No logs to display. Start the simulation to see activity.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
