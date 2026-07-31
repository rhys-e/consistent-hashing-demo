import React, { useState } from 'react';
import { motion, useMotionValueEvent, useTransform } from 'motion/react';
import theme from '../../themes';
import { useScramble } from '../../story/useScramble';

/**
 * A remark that sits beside the picture instead of over it.
 *
 * `SceneNote` earns its scrim by running over an opening frame not yet worth
 * looking at. Everywhere else the frame *is* the explanation, and three of the
 * lines this replaces were deictic — they pointed at a picture the blur had just
 * removed. So this takes the reading rest and none of the occlusion.
 *
 * It renders in the share panel's column, under the numbers, because that is where
 * the eye already goes for a claim about quantity, and because the column is empty
 * below the panel's last line. Inside the SVG rather than beside it so it travels
 * with the artwork under `preserveAspectRatio` — a note anchored to the viewport
 * would drift away from the panel it belongs to at other stage sizes.
 *
 * The box is about thirty words at this size, and that ceiling is the point: it
 * makes the paragraph-long narration this replaces impossible to write here.
 *
 * There is no countdown rule under it, unlike `SceneNote`. That rule answers "how
 * long until I get the picture back", which is a question a note that hides the
 * picture has to answer. This one never took it away, so it can simply stay — and
 * a line that stays is one the viewer can come back to rather than one they have
 * to catch.
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
