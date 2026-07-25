import theme from '../themes';
import { toXY } from '../utils/geometryUtils';

export function PreviewIndicator({ userRequest, width, height, radius }) {
  const [x, y] = toXY(userRequest.position, width, height, radius);
  return (
    <g className="preview-indicator">
      <path
        d={`M ${width / 2} ${height / 2} L ${x} ${y}`}
        stroke={theme.hashRing.previewIndicator.pathColor}
        strokeWidth={theme.hashRing.previewIndicator.pathWidth}
        strokeDasharray={theme.hashRing.previewIndicator.pathDashArray}
        opacity={theme.hashRing.previewIndicator.opacity}
        className="preview-path animate-dash"
      />
      <circle
        cx={x}
        cy={y}
        r={theme.hashRing.previewIndicator.dotSize}
        fill={theme.hashRing.previewIndicator.dotColor}
        className="preview-dot animate-blink"
      />
    </g>
  );
}
