import { createStore } from '@xstate/store';
import theme from '../../themes';

export const dimensionsStore = createStore({
  context: {
    svgWidth: 0,
    svgHeight: 0,
    svgRadius: 0,
  },
  on: {
    calculate: (
      context,
      {
        isMobile,
        SVG_WIDTH_PERCENTAGE,
        SVG_ASPECT_RATIO,
        SVG_RADIUS_PERCENTAGE,
        CONTAINER_MAX_WIDTH,
      }
    ) => {
      const pagePadding = isMobile ? 0 : theme.layout.pagePadding;
      const columnGap = isMobile ? 0 : theme.layout.columnGap;
      const containerWidth = Math.min(window.innerWidth - pagePadding, CONTAINER_MAX_WIDTH);
      const availableWidth = containerWidth - columnGap;

      const svgWidth = isMobile
        ? availableWidth
        : Math.min((availableWidth * SVG_WIDTH_PERCENTAGE) / 100, availableWidth * 0.85);

      const svgHeight = svgWidth * SVG_ASPECT_RATIO;
      const svgRadius = (svgWidth / 2) * (SVG_RADIUS_PERCENTAGE / 100);

      return {
        ...context,
        svgWidth,
        svgHeight,
        svgRadius,
      };
    },
  },
});
