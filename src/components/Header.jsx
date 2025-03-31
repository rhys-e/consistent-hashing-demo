import React from 'react';

export function Header({ stackCount = 5 }) {
  return (
    <>
      <div className="flex items-end justify-between border-b-2 border-cyber-border pb-2">
        <h1 className={`text-glow m-0 text-xl tracking-wider text-heading-color md:text-2xl`}>
          <div className="stack" style={{ '--stacks': stackCount }}>
            {Array.from({ length: stackCount }).map((_, index) => (
              <span className="text-glow" key={index} style={{ '--index': index }}>
                CONSISTENT HASHING{' '}
                <span className="hidden text-[0.8em] text-ui-text-secondary md:inline">
                  // VISUALISATION
                </span>
              </span>
            ))}
          </div>
        </h1>
      </div>

      <p
        className={`hidden border-l-[3px] border-l-btn-purple-border bg-btn-neutral-bg p-[1rem_1rem] pl-4 text-ui-text-bright md:block`}
      >
        <span className="text-ui-text-success">:: SYSTEM STATUS</span> // Distributing requests
        across server nodes.
        <br />
        Routing algorithm: particles routed to first node clockwise on ring from hash position.
      </p>
    </>
  );
}
