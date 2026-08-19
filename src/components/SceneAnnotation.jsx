import React, { useState } from 'react';
import { motion, useMotionValueEvent, useTransform } from 'motion/react';
import theme from '../themes';
import { useScramble } from '../story/useScramble';

/**
 * Standing commentary in the share-panel column, inside the SVG so it travels
 * with the artwork. About thirty words at this size. Does not blur the picture.
 */

export function SceneAnnotation({ progress, x, y, width, height = 110, textFor, presenceFor }) {
  const [text, setText] = useState(() => textFor(progress.get()));
  // Text is not an attribute, so it cannot ride a motion value out of render. It
  // changes only at an annotation boundary, where the scene is standing still.
  useMotionValueEvent(progress, 'change', latest => setText(current => textFor(latest) ?? current));

  const opacity = useTransform(progress, presenceFor);
  const resolved = useScramble({ text: text ?? '', durationMs: 500 });

  return (
    <motion.g data-layer="annotation" style={{ opacity }}>
      <foreignObject x={x} y={y} width={width} height={height}>
        <div xmlns="http://www.w3.org/1999/xhtml">
          <p
            className="font-mono"
            style={{
              margin: 0,
              fontSize: '13px',
              lineHeight: 1.65,
              letterSpacing: '0.02em',
              color: theme.colors.ui.text.primary,
            }}
          >
            {resolved}
          </p>
        </div>
      </foreignObject>
    </motion.g>
  );
}

export default SceneAnnotation;
