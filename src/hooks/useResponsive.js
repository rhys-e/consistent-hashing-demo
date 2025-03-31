import { useState, useLayoutEffect } from 'react';

export function useResponsive(breakpoint = 950) {
  const [isMobile, setIsMobile] = useState(false);

  useLayoutEffect(() => {
    function updateSize() {
      setIsMobile(window.innerWidth < breakpoint);
    }

    // Set initial value
    updateSize();

    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [breakpoint]);

  return { isMobile };
}
