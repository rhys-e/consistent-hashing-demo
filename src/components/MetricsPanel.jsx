import React from 'react';
import { ToggleIcon } from './ToggleIcon';
import { useSelector } from '../hooks/useStore';
import { statsStore } from '../state/stores';

export function MetricsPanel({ collapsed, togglePanel, servers, vnodeCount, ringNodes }) {
  const { nodeStats, loadImbalance, totalRequests } = useSelector(statsStore);

  return (
    <div className="rounded-sm border border-cyber-border bg-panel-bg p-4 font-mono md:p-6">
      <div className="panel-header" onClick={togglePanel}>
        <h3 className="panel-title panel-title-with-dot panel-title-with-dot-metrics text-heading-color">
          System Metrics
        </h3>
        <div className="panel-toggle flex items-center justify-center">
          <ToggleIcon isExpanded={!collapsed} size={12} />
        </div>
      </div>

      <div
        className={`panel-content ${collapsed ? 'panel-content-collapsed' : 'panel-content-expanded'}`}
      >
        <div className="mt-4 border border-cyber-border bg-dark-cyber bg-opacity-70 p-4 font-mono text-[0.9rem]">
          <p className="m-0 mb-2 flex justify-between">
            <span className="text-ui-text-secondary">SERVER_COUNT:</span>
            <span className="text-ui-text-bright">{servers.length}</span>
          </p>
          <p className="m-0 mb-2 flex justify-between">
            <span className="text-ui-text-secondary">VNODE_PER_SERVER:</span>
            <span className="text-ui-text-bright">{Math.max(1, vnodeCount)}</span>
          </p>
          <p className="m-0 mb-2 flex justify-between">
            <span className="text-ui-text-secondary">TOTAL_RING_NODES:</span>
            <span className="text-ui-text-bright">{Object.keys(ringNodes).length}</span>
          </p>
          <p className="m-0 mb-2 flex justify-between">
            <span className="text-ui-text-secondary">REQUESTS_PROCESSED:</span>
            <span className="text-ui-text-bright">{totalRequests}</span>
          </p>
          <p className="m-0 mb-2 flex justify-between">
            <span className="text-ui-text-secondary">LOAD_IMBALANCE:</span>
            <span
              className={`${loadImbalance < 10 ? 'text-ui-text-success' : loadImbalance < 30 ? 'text-ui-text-warning' : 'text-ui-text-error'}`}
            >
              {loadImbalance.toFixed(2)}%
            </span>
          </p>
          <p className="mt-2 text-sm italic text-ui-text-secondary">
            // Lower imbalance = optimal distribution
          </p>
        </div>

        {servers.length > 0 && (
          <div className="mt-4 border border-cyber-border bg-dark-cyber bg-opacity-70 p-4">
            <h4 className="m-0 mb-3 text-[0.9rem] uppercase tracking-wider text-ui-text-bright">
              Node Load Distribution
            </h4>
            {/* sort lexographically */}
            {servers
              .sort((a, b) => a.id.localeCompare(b.id))
              .map(server => {
                const requests = nodeStats[server.id] || 0;
                const maxRequests = Math.max(...Object.values(nodeStats), 1);
                const percentage = Math.round((requests / maxRequests) * 100) || 0;

                return (
                  <div key={server.id} className="mb-3">
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center">
                        <div
                          className="mr-2 h-[10px] w-[10px] rounded-sm"
                          style={{
                            background: server.color,
                            boxShadow: `0 0 5px ${server.color}`,
                          }}
                        />
                        <span className="text-[0.9rem] text-ui-text-bright">{server.id}</span>
                      </div>
                      <span className="text-[0.9rem] text-ui-text-bright">{requests}</span>
                    </div>

                    {/* Progress bar */}
                    <div className="relative h-[5px] w-full overflow-hidden bg-dark-cyber">
                      <div
                        className={`absolute h-full transition-[width] duration-normal ease-default`}
                        style={{
                          width: `${percentage}%`,
                          background: server.color,
                          boxShadow: `0 0 10px ${server.color}`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
