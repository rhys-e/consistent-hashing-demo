import React from 'react';

export function ToggleIcon({ isExpanded, size = 14 }) {
  return (
    <div className="flex h-5 w-5 items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox="0 0 14 14"
        fill="currentColor"
        className="pointer-events-none"
      >
        {isExpanded ? (
          // Minus icon
          <rect x="2" y="6" width="10" height="2" />
        ) : (
          // Plus icon
          <>
            <rect x="2" y="6" width="10" height="2" />
            <rect x="6" y="2" width="2" height="10" />
          </>
        )}
      </svg>
    </div>
  );
}

export default ToggleIcon;
