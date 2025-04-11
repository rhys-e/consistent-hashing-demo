import { useEffect } from 'react';
import { useResponsive } from './useResponsive';
import { dimensionsStore } from '../state/stores/dimensionsStore';

export function useResponsiveDimensions({
  SVG_WIDTH_PERCENTAGE,
  SVG_ASPECT_RATIO,
  SVG_RADIUS_PERCENTAGE,
  CONTAINER_MAX_WIDTH = 1200,
}) {
  const { isMobile } = useResponsive(950);

  useEffect(() => {
    function calculateDimensions() {
      dimensionsStore.trigger.calculate({
        isMobile,
        SVG_WIDTH_PERCENTAGE,
        SVG_ASPECT_RATIO,
        SVG_RADIUS_PERCENTAGE,
        CONTAINER_MAX_WIDTH,
      });
    }

    calculateDimensions();
    window.addEventListener('resize', calculateDimensions);
    return () => window.removeEventListener('resize', calculateDimensions);
  }, [
    SVG_WIDTH_PERCENTAGE,
    SVG_ASPECT_RATIO,
    SVG_RADIUS_PERCENTAGE,
    CONTAINER_MAX_WIDTH,
    isMobile,
  ]);
}
