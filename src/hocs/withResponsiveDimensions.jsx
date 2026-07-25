import { useState, useLayoutEffect } from 'react';
import { dimensionsStore } from '../state/stores/dimensionsStore';

function calculateDimensions(
  isMobile,
  SVG_WIDTH_PERCENTAGE,
  SVG_ASPECT_RATIO,
  SVG_RADIUS_PERCENTAGE,
  CONTAINER_MAX_WIDTH
) {
  dimensionsStore.trigger.calculate({
    isMobile,
    SVG_WIDTH_PERCENTAGE,
    SVG_ASPECT_RATIO,
    SVG_RADIUS_PERCENTAGE,
    CONTAINER_MAX_WIDTH,
  });
}

export function withResponsiveDimensions(WrappedComponent) {
  return function WithResponsiveDimensions({
    SVG_WIDTH_PERCENTAGE,
    SVG_ASPECT_RATIO,
    SVG_RADIUS_PERCENTAGE,
    MOBILE_BREAKPOINT,
    CONTAINER_MAX_WIDTH = 1200,
    ...props
  }) {
    const [isMobile, setIsMobile] = useState(false);

    useLayoutEffect(() => {
      function updateSize() {
        const newIsMobile = window.innerWidth < MOBILE_BREAKPOINT;
        setIsMobile(newIsMobile);
        calculateDimensions(
          newIsMobile,
          SVG_WIDTH_PERCENTAGE,
          SVG_ASPECT_RATIO,
          SVG_RADIUS_PERCENTAGE,
          CONTAINER_MAX_WIDTH
        );
      }

      // Set initial value
      updateSize();

      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }, [
      SVG_WIDTH_PERCENTAGE,
      SVG_ASPECT_RATIO,
      SVG_RADIUS_PERCENTAGE,
      CONTAINER_MAX_WIDTH,
      MOBILE_BREAKPOINT,
    ]);

    return <WrappedComponent {...props} isMobile={isMobile} />;
  };
}
