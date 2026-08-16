import React from 'react';
import { useTransform } from 'motion/react';
import theme from '../themes';
import { ringPoint } from '../story/projection';
import { SANDBOX_LIMITS } from '../story/sandbox';
import { LAYOUT, ServerRing } from './RingParts';
import ServerLoadPanel from './ServerLoadPanel';

/**
 * The ring the viewer is changing, and the numbers it produces.
 *
 * `settle` runs 0 → 1 on every change. The bars read it so they move to their new
 * lengths rather than jumping, and the two rings read it in opposite directions so
 * the old ownership dissolves into the new one. Nothing here is on a timeline —
 * this is the one scene in the story driven by a person rather than a beat.
 */
export function SandboxRing({ sandbox, settle }) {
  const { centreX, centreY, radius } = LAYOUT;
  const seam = ringPoint({ ...LAYOUT, radius, position: 0 });
  const seamOut = ringPoint({ ...LAYOUT, radius: radius + 24, position: 0 });

  const rangesFor = (topology, serverId) =>
    topology.ranges.filter(range => range.serverId === serverId);

  const arriving = useTransform(settle, latest => latest);
  const leaving = useTransform(settle, latest => 1 - latest);

  const { change } = sandbox;
  const pct = value => `${(value * 100).toFixed(1)}%`;
  /** Under the panel, whatever the roster size, so the pair does not jump. */
  const costY = LAYOUT.panel.y + 34 + SANDBOX_LIMITS.maxServers * 34 + 56;

  const shareOf = (shares, id) => shares?.find(entry => entry.id === id)?.share ?? 0;
  /**
   * A row per server that is on the ring now *or* was a moment ago, so a server
   * being dropped drains to nothing instead of vanishing mid-bar.
   */
  const rows = (
    sandbox.previous?.servers.length > sandbox.servers.length
      ? sandbox.previous.servers
      : sandbox.servers
  ).map(server => ({
    id: server.id,
    color: server.color,
    from: shareOf(sandbox.previous?.shares ?? sandbox.shares, server.id),
    to: shareOf(sandbox.shares, server.id),
  }));

  return (
    <g>
      <circle
        data-layer="reference-ring"
        cx={centreX}
        cy={centreY}
        r={radius}
        fill="none"
        stroke={theme.colors.primary.cyberBlue}
        strokeWidth="1.25"
        opacity="0.3"
      />
      <line
        data-layer="seam"
        x1={seam.x}
        y1={seam.y}
        x2={seamOut.x}
        y2={seamOut.y}
        stroke={theme.colors.primary.cyberBlue}
        strokeWidth="1.25"
        opacity="0.5"
      />

      {/* The ownership that is going, under the ownership that is arriving. Two
          topologies cannot be tweened — a position count changes the whole set of
          boundaries — so they are crossfaded, which is what the density ramp in
          the full-scale scenes does for the same reason. */}
      {sandbox.previous
        ? sandbox.previous.servers.map(server => (
            <ServerRing
              key={`was-${server.id}`}
              ranges={rangesFor(sandbox.previous.topology, server.id)}
              color={server.color}
              opacity={leaving}
            />
          ))
        : null}

      {sandbox.servers.map(server => (
        <g key={server.id} data-layer={`ring:${server.id}`}>
          <ServerRing
            ranges={rangesFor(sandbox.topology, server.id)}
            color={server.color}
            opacity={sandbox.previous ? arriving : 1}
          />
        </g>
      ))}

      {/* Two figures, in the column where every other scene puts its numbers.
          They were in the control bar underneath, which put a measurement among
          the controls and, on a narrow window, pushed the controls onto a second
          line. */}
      {change ? (
        <g data-layer="cost">
          <text
            x={LAYOUT.panel.x}
            y={costY}
            fill={theme.colors.ui.text.secondary}
            fontSize="11"
            letterSpacing="1.6"
          >
            {change.gained ? 'ADDING A SERVER MOVED' : 'REMOVING A SERVER MOVED'}
          </text>
          <text
            x={LAYOUT.panel.x + LAYOUT.panel.width}
            y={costY}
            textAnchor="end"
            fill={theme.colors.ui.text.bright}
            fontSize="13"
            letterSpacing="1.2"
          >
            {pct(change.fraction)}
          </text>

          <text
            x={LAYOUT.panel.x}
            y={costY + 24}
            fill={theme.colors.ui.text.secondary}
            fontSize="11"
            letterSpacing="1.6"
          >
            WITHOUT THE RING
          </text>
          <text
            x={LAYOUT.panel.x + LAYOUT.panel.width}
            y={costY + 24}
            textAnchor="end"
            fill={theme.colors.ui.text.warning}
            fontSize="13"
            letterSpacing="1.2"
          >
            {pct(change.modulo)}
          </text>
        </g>
      ) : null}

      <ServerLoadPanel
        {...LAYOUT.panel}
        rows={rows}
        progress={settle}
        settleFor={latest => latest}
        revealFor={() => 1}
        evenShare={sandbox.evenShare}
        evenMark={0.62}
      />
    </g>
  );
}

export default SandboxRing;
