import React, { useState } from 'react';
import { HashRingVisualisation } from './HashRingVisualisation';
import { ConsoleLog } from './ConsoleLog';
import { Header } from './Header';
import { ControlsPanel } from './ControlsPanel';
import { MetricsPanel } from './MetricsPanel';
import { useSelector } from '../hooks/useStore';
import { dimensionsStore } from '../state/stores';
import { useApp } from '../context/AppContext';

export function App({ isMobile }) {
  const dimensions = useSelector(dimensionsStore);
  const NUM_STACKS = 5;

  const {
    nodes: { nodes, virtualNodes, numVirtualNodesPerNode },
  } = useApp();

  const [collapsedPanels, setCollapsedPanels] = useState({
    controls: false,
    metrics: true,
    documentation: false,
    legend: true,
    status: true,
    console: true,
  });

  const togglePanel = panelName => {
    setCollapsedPanels(prev => ({
      ...prev,
      [panelName]: !prev[panelName],
    }));
  };

  return (
    <div
      className={`mx-auto flex min-h-screen max-w-[1200px] flex-col bg-body-bg p-0 font-mono text-body-text md:p-8`}
    >
      <Header stackCount={NUM_STACKS} />

      <div className="flex flex-col gap-4 md:flex-row">
        {/* Visualisation Panel */}
        <div
          className="flex w-full flex-col gap-4 md:w-auto"
          style={{ width: isMobile ? '100%' : `${dimensions.svgWidth}px` }}
        >
          <HashRingVisualisation
            hitsToRender={[]}
            collapsedPanels={collapsedPanels}
            togglePanel={togglePanel}
          />

          <div className="hidden md:block">
            <ConsoleLog
              collapsed={collapsedPanels.console}
              togglePanel={() => togglePanel('console')}
            />
          </div>
        </div>

        {/* Controls and Stats Panel */}
        <div
          className="flex flex-1 flex-col gap-4"
          style={{ minWidth: isMobile ? '100%' : 'min(15vw, 180px)' }}
        >
          {/* Controls Panel */}
          <ControlsPanel
            collapsed={collapsedPanels.controls}
            togglePanel={() => togglePanel('controls')}
            dimensions={dimensions}
          />

          {/* Stats display */}
          <MetricsPanel
            collapsed={collapsedPanels.metrics}
            togglePanel={() => togglePanel('metrics')}
            nodes={nodes}
            numVirtualNodesPerNode={numVirtualNodesPerNode}
            virtualNodes={virtualNodes}
          />
        </div>
      </div>
      <a
        href="https://github.com/rhys-e/consistent-hashing-demo"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-sm p-0 pb-2 text-[0.65em] text-ui-text-secondary no-underline transition-colors duration-200 hover:text-ui-text-primary"
      >
        <span className="tracking-wide">[SOURCE]</span>
      </a>
    </div>
  );
}
