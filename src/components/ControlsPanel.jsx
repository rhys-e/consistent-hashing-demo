import { useEffect } from 'react';
import { ToggleIcon } from './ToggleIcon';
import { useExecutionStatus, EXECUTION_STATES } from '../hooks/useExecutionStatus';
import { useAtom } from '../hooks/useStore';
import {
  vnodeCountAtom,
  speedMultiplierAtom,
  resetVnodeCount,
  resetSpeedMultiplier,
  resetNumRequests,
  numRequestsAtom,
} from '../state/atoms';
import { serversStore, statsStore, consoleLogStore } from '../state/stores';
import { useSelector } from '../hooks/useStore';

export function ControlsPanel({ collapsed, togglePanel, dimensions }) {
  const { toggleRunning, stop, executionStatus } = useExecutionStatus();
  const speedMultiplier = useAtom(speedMultiplierAtom);
  const vnodeCount = useAtom(vnodeCountAtom);
  const { event: serversEvent } = useSelector(serversStore);
  const numRequests = useAtom(numRequestsAtom);

  const handleReset = () => {
    stop();
    serversStore.trigger.reset();
    resetVnodeCount();
    resetSpeedMultiplier();
    resetNumRequests();
    statsStore.trigger.reset();
    consoleLogStore.trigger.clear();
    consoleLogStore.trigger.log({ message: 'System reset to initial state' });
  };

  const handleExecute = () => {
    if (executionStatus === EXECUTION_STATES.RUNNING) {
      consoleLogStore.trigger.log({ message: 'Simulation paused' });
      toggleRunning();
    } else {
      consoleLogStore.trigger.log({ message: 'Simulation started' });
      toggleRunning();
    }
  };

  const handleVnodeCountChange = e => {
    const newVnodeCount = Number(e.target.value);
    vnodeCountAtom.set(newVnodeCount);
    consoleLogStore.trigger.log({ message: `Virtual node count set to ${newVnodeCount}` });
  };

  const handleAddServer = () => {
    serversStore.trigger.add();
    if (executionStatus === EXECUTION_STATES.RUNNING) {
      consoleLogStore.trigger.log({
        message: `Server configuration updated: ${servers.length} nodes active`,
      });
    }
  };

  const handleNumRequestsChange = e => {
    const newNumRequests = Number(e.target.value);
    numRequestsAtom.set(newNumRequests);
  };

  useEffect(() => {
    if (serversEvent?.type === 'add') {
      consoleLogStore.trigger.log({ message: `Added new server: ${serversEvent.payload.id}` });
    }
  }, [serversEvent]);

  return (
    <div
      className="rounded-sm border border-cyber-border bg-panel-bg p-4 md:p-6"
      style={{
        minHeight: collapsed ? 'auto' : `${dimensions.svgHeight}px`,
      }}
    >
      <div className="panel-header" onClick={togglePanel}>
        <h3 className="panel-title panel-title-with-dot panel-title-with-dot-controls text-heading-color">
          System Controls
        </h3>
        <div className="panel-toggle flex items-center justify-center">
          <ToggleIcon isExpanded={!collapsed} size={12} />
        </div>
      </div>

      <div
        className={`panel-content ${collapsed ? 'panel-content-collapsed' : 'panel-content-expanded'}`}
      >
        <div className="mb-4 mt-4 flex gap-2">
          <button
            className={`btn flex-1 cursor-pointer rounded-sm border px-4 py-2 font-bold shadow-md transition-all ${
              executionStatus === EXECUTION_STATES.RUNNING
                ? 'border-btn-danger-border bg-btn-danger-bg text-ui-text-bright shadow-btn-danger-shadow'
                : 'border-btn-success-border bg-btn-success-bg text-ui-text-bright shadow-btn-success-shadow'
            } `}
            onClick={handleExecute}
          >
            {executionStatus === EXECUTION_STATES.RUNNING ? 'HALT' : 'EXECUTE'}
          </button>

          <button
            className="btn flex-1 cursor-pointer rounded-sm border border-cyber-border bg-btn-neutral-bg px-4 py-2 font-bold text-ui-text-bright shadow-button-glow shadow-btn-neutral-shadow"
            onClick={handleReset}
          >
            RESET
          </button>
        </div>

        <div className="mb-6">
          <button
            className="btn w-full cursor-pointer rounded-sm border border-btn-purple-border bg-btn-purple-bg px-4 py-2 font-bold text-ui-text-bright shadow-button-glow shadow-btn-purple-shadow"
            onClick={handleAddServer}
          >
            ADD SERVER NODE
          </button>
          <p className="mt-2 text-sm italic text-ui-text-secondary">
            // Click node on ring to terminate server
          </p>
        </div>

        <div className="mb-4 border border-cyber-border bg-dark-cyber bg-opacity-70 p-4">
          <label className="mb-3 block text-ui-text-bright">
            <span className="text-body-text">PARTICLE_SPEED:</span> {speedMultiplier.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={speedMultiplier}
            onChange={e => speedMultiplierAtom.set(Number(e.target.value))}
            className="w-full"
          />
          <p className="mt-2 text-sm italic text-ui-text-secondary">
            // Adjust particle travel speed
          </p>
        </div>

        <div className="mb-4 border border-cyber-border bg-dark-cyber bg-opacity-70 p-4">
          <label className="mb-3 block text-ui-text-bright">
            <span className="text-body-text">VNODE_COUNT:</span> {vnodeCount}
          </label>
          <input
            type="range"
            min="1"
            max="20"
            value={vnodeCount}
            onChange={handleVnodeCountChange}
            className="w-full"
          />
          <p className="mt-2 text-sm italic text-ui-text-secondary">
            // Higher count = better distribution
          </p>
        </div>

        <div className="mb-4 border border-cyber-border bg-dark-cyber bg-opacity-70 p-4">
          <label className="mb-3 block text-ui-text-bright">
            <span className="text-body-text">USER_COUNT:</span> {numRequests}
          </label>
          <input
            type="range"
            min="1"
            max="20"
            value={numRequests}
            onChange={handleNumRequestsChange}
            className="w-full"
          />
          <p className="mt-2 text-sm italic text-ui-text-secondary">
            // Number of concurrent users in the system
          </p>
        </div>
      </div>
    </div>
  );
}
