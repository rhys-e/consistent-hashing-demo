import { useState, useCallback } from 'react';

export function useHashRingTooltip(numVirtualNodesPerNode) {
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    content: '',
  });

  const handleNodeMouseEnter = useCallback(
    (x, y, node) => {
      setTooltip({
        visible: true,
        x: x,
        y: y - 20,
        content: `${node.nodeId}: vnode ${node.vnodeIndex + 1} of ${numVirtualNodesPerNode} [${(node.position * 100).toFixed(1)}%]`,
      });
    },
    [numVirtualNodesPerNode]
  );

  const handleNodeMouseLeave = useCallback(() => {
    setTooltip({ visible: false });
  }, []);

  return {
    tooltip,
    handleNodeMouseEnter,
    handleNodeMouseLeave,
  };
}
