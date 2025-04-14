import React from 'react';
import { toXY } from '../utils/geometryUtils';
import theme from '../themes';

export function ServerNode({ node, width, height, radius, onClick, onMouseEnter, onMouseLeave }) {
  const [x, y] = toXY(node.position, width, height, radius);

  return (
    <circle
      cx={x}
      cy={y}
      r={theme.hashRing.node.size}
      fill={node.color}
      stroke={theme.hashRing.node.strokeColor}
      strokeWidth={theme.hashRing.node.strokeWidth}
      filter={theme.hashRing.node.glowFilter}
      onClick={() => onClick(node)}
      onMouseEnter={() => onMouseEnter(x, y, node)}
      onMouseLeave={onMouseLeave}
      className="node-element cursor-pointer"
    />
  );
}
