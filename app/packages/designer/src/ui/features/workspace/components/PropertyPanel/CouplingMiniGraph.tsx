import React, { useMemo } from 'react';
import type { CoupledFileForensics } from '@blueprint/core';

export interface CouplingMiniGraphProps {
  centerLabel: string;
  coupled: CoupledFileForensics[];
  /** Paths that resolve to nodes on the current diagram (highlighted). */
  linkedPaths?: ReadonlySet<string>;
  /** Called when a linked peer node is clicked. */
  onPeerClick?: (path: string) => void;
}

const SIZE = 140;
const CENTER = SIZE / 2;
const PEER_RADIUS = 46;
const NODE_R = 10;

function basename(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || path;
}

/**
 * Radial mini-graph of temporal coupling peers (display-only).
 */
export const CouplingMiniGraph: React.FC<CouplingMiniGraphProps> = ({
  centerLabel,
  coupled,
  linkedPaths,
  onPeerClick,
}) => {
  const peers = coupled.slice(0, 5);

  const layout = useMemo(() => {
    return peers.map((peer, index) => {
      const angle = (2 * Math.PI * index) / peers.length - Math.PI / 2;
      return {
        peer,
        x: CENTER + PEER_RADIUS * Math.cos(angle),
        y: CENTER + PEER_RADIUS * Math.sin(angle),
      };
    });
  }, [peers]);

  if (peers.length === 0) return null;

  return (
    <div
      className="rounded-xl border border-slate-900 bg-slate-950/40 p-2"
      data-testid="coupling-mini-graph"
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto block">
        {layout.map(({ peer, x, y }) => (
          <line
            key={`edge-${peer.path}`}
            x1={CENTER}
            y1={CENTER}
            x2={x}
            y2={y}
            stroke="rgb(251 191 36 / 0.45)"
            strokeWidth={1 + peer.score * 2}
          />
        ))}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={NODE_R + 2}
          fill="rgb(15 23 42)"
          stroke="rgb(0 240 255)"
        />
        <text
          x={CENTER}
          y={CENTER + 3}
          textAnchor="middle"
          className="fill-slate-200"
          fontSize="7"
          fontFamily="ui-monospace, monospace"
        >
          {centerLabel.length > 10 ? `${centerLabel.slice(0, 9)}…` : centerLabel}
        </text>
        {layout.map(({ peer, x, y }) => {
          const linked = linkedPaths?.has(peer.path);
          const clickable = linked && onPeerClick;
          return (
            <g
              key={peer.path}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              className={clickable ? 'cursor-pointer' : undefined}
              data-testid={linked ? `coupling-peer-${basename(peer.path)}` : undefined}
              onClick={
                clickable
                  ? event => {
                      event.stopPropagation();
                      onPeerClick(peer.path);
                    }
                  : undefined
              }
              onKeyDown={
                clickable
                  ? event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onPeerClick(peer.path);
                      }
                    }
                  : undefined
              }
            >
              <circle
                cx={x}
                cy={y}
                r={NODE_R}
                fill={linked ? 'rgb(251 191 36 / 0.25)' : 'rgb(30 41 59)'}
                stroke={linked ? 'rgb(251 191 36)' : 'rgb(100 116 139)'}
              />
              <title>
                {peer.path} — score {peer.score.toFixed(2)}, {peer.sharedCommits} shared commits
              </title>
              <text
                x={x}
                y={y + NODE_R + 8}
                textAnchor="middle"
                className="fill-slate-400"
                fontSize="6"
                fontFamily="ui-monospace, monospace"
              >
                {basename(peer.path).length > 12
                  ? `${basename(peer.path).slice(0, 11)}…`
                  : basename(peer.path)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
