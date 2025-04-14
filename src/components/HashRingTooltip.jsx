import React from 'react';
import theme from '../themes';

export function HashRingTooltip({ visible, x, y, content, width, height }) {
  if (!visible) return null;

  return (
    <foreignObject
      x={Math.min(
        Math.max(x - theme.hashRing.tooltip.width / 2, 10),
        width - theme.hashRing.tooltip.width - 10
      )}
      y={Math.min(
        Math.max(y - theme.hashRing.tooltip.height, 10),
        height - theme.hashRing.tooltip.height - 10
      )}
      width={theme.hashRing.tooltip.width}
      height={theme.hashRing.tooltip.height}
    >
      <div className="absolute flex h-full w-full items-center justify-center rounded-sm border border-tooltip-border bg-tooltip-bg p-1 text-center font-mono text-tooltip-text">
        {content}
      </div>
    </foreignObject>
  );
}
