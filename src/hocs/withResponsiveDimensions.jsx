import { useEffect } from 'react';
import { useResponsive } from '../hooks/useResponsive';
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
    const { isMobile } = useResponsive({ breakpoint: MOBILE_BREAKPOINT });

    useEffect(() => {
      function updateDimensions() {
        calculateDimensions(
          isMobile,
          SVG_WIDTH_PERCENTAGE,
          SVG_ASPECT_RATIO,
          SVG_RADIUS_PERCENTAGE,
          CONTAINER_MAX_WIDTH
        );
      }
      updateDimensions();
      window.addEventListener('resize', updateDimensions);
      return () => window.removeEventListener('resize', updateDimensions);
    }, [
      SVG_WIDTH_PERCENTAGE,
      SVG_ASPECT_RATIO,
      SVG_RADIUS_PERCENTAGE,
      CONTAINER_MAX_WIDTH,
      isMobile,
    ]);

    return <WrappedComponent {...props} isMobile={isMobile} />;
  };
}
