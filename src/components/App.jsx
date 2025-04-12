import React, { useState } from 'react';
import { HashRingVisualisation } from './HashRingVisualisation';
import { useParticleSimulation } from '../hooks/useParticleSimulation';
import { ConsoleLog } from './ConsoleLog';
import { Header } from './Header';
import { ControlsPanel } from './ControlsPanel';
import { MetricsPanel } from './MetricsPanel';
import { EXECUTION_STATES } from '../hooks/useExecutionStatus';
import { withResponsiveDimensions } from '../hocs/withResponsiveDimensions';
import { useSelector, useAtom } from '../hooks/useStore';
import { speedMultiplierAtom } from '../state/atoms';
import { dimensionsStore, virtualNodeStore, userRequestStore } from '../state/stores';
import { useApp } from '../context/AppContext';
import { useSystemLogging } from '../hooks/useSystemLogging';

function AppComponent({ isMobile }) {
  const dimensions = useSelector(dimensionsStore);
  const { nodes, numVirtualNodesPerNode, virtualNodes } = useSelector(virtualNodeStore);
  const { numRequests } = useSelector(userRequestStore);
  const speedMultiplier = useAtom(speedMultiplierAtom);
  const NUM_STACKS = 5;

  const { executionStatus, send } = useApp();
  const { addLog } = useSystemLogging();

  const [collapsedPanels, setCollapsedPanels] = useState({
    controls: false,
    metrics: true,
    documentation: false,
    legend: true,
    status: true,
    console: true,
  });

  const handleRequestCompleted = (node, completedParticle) => {
    trackRequest(node.id);

    const detailedMessage =
      `Request processed by ${node.id}: Id=${completedParticle.data.id}, Pos=${completedParticle.data.ringStartPos.toFixed(2)}%, ` +
      `VnodeId='${node.vnodeId}', VNode=#${node.vnodeIndex + 1}/${numVirtualNodesPerNode}, VPos=${node.position.toFixed(2)}%`;

    // addLog(detailedMessage, 'success');
  };

  const handleReroutedParticles = reroutedParticles => {
    if (executionStatus !== EXECUTION_STATES.RUNNING) {
      return;
    }

    // group rerouted particles by target node
    const targetNodes = {};
    reroutedParticles.forEach(reroutedParticle => {
      if (!targetNodes[reroutedParticle.targetNodeId]) {
        targetNodes[reroutedParticle.targetNodeId] = [];
      }
      targetNodes[reroutedParticle.targetNodeId].push(reroutedParticle);
    });

    Object.keys(targetNodes).forEach(targetNodeId => {
      const percentage = Math.round((targetNodes[targetNodeId].length / numRequests) * 100);
      // addLog(
      //   `Rerouted ${targetNodes[targetNodeId].length} requests to ${targetNodeId} (${percentage}%)`,
      //   'warning'
      // );
    });
  };

  const { pCurPos, pRingInitialPos, hitsToRender, renderNodes } = useParticleSimulation({
    ringNodes: virtualNodes,
    speedMultiplier,
    numVirtualNodesPerNode,
    reroutedCallback: handleReroutedParticles,
    requestCompletedCallback: handleRequestCompleted,
    numRequests,
    dimensions: {
      SVG_WIDTH: dimensions.svgWidth,
      SVG_HEIGHT: dimensions.svgHeight,
      SVG_RADIUS: dimensions.svgRadius,
    },
  });

  const addServer = () => {
    virtualNodeStore.trigger.addNode();
    //addLog(`Added new server: ${servers[servers.length - 1].id}`, 'info');
  };

  const removeServer = id => {
    virtualNodeStore.trigger.removeNode(id);
    //addLog(`Removed server: ${id}`, 'warning');
  };

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
            dimensions={dimensions}
            ringNodes={renderNodes}
            pCurPos={pCurPos}
            pRingInitialPos={pRingInitialPos}
            onRemoveServer={removeServer}
            hitsToRender={hitsToRender}
            collapsedPanels={collapsedPanels}
            togglePanel={togglePanel}
            onAddServer={addServer}
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

export const App = withResponsiveDimensions(AppComponent);
