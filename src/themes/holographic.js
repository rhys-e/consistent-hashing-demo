import cyberTheme from './cyber';

const deepClone = obj => JSON.parse(JSON.stringify(obj));
const baseTheme = deepClone(cyberTheme);

const holographicTheme = {
  ...baseTheme,

  // Color palette
  colors: {
    ...baseTheme.colors,
    // Main holographic colors
    primary: {
      neoRed: '#FF5E87', // Holographic pink-red
      cyberBlue: '#00CCFF', // Bright cyan
      matrixGreen: '#00FFCC', // Mint green
      neonOrange: '#FF9966', // Soft orange
      synthwavePurple: '#CC99FF', // Lavender
      tealHologram: '#33FFFF', // Bright teal
      softNeonPink: '#FF99CC', // Soft pink
      rustedBronze: '#CC9966', // Gold bronze
      chromeSilver: '#E6F0FF', // Iridescent silver
      magentaHaze: '#FF66CC', // Bright magenta
      electricAmber: '#FFCC66', // Soft amber
      digitalLime: '#CCFF66', // Lime green
      cyberdeckAqua: '#66FFFF', // Bright aqua
      virtualGold: '#FFDD99', // Soft gold
      acidYellow: '#FFFF66', // Bright yellow
      terminalGreen: '#99FFCC', // Soft green
      holographicPink: '#FF99FF', // Bright pink
      circuitBlue: '#99CCFF', // Soft blue
      techBronze: '#DDAA77', // Light bronze
      augmentedBeige: '#FFEECC', // Cream
      circuitPurple: '#CC99FF', // Lavender/purple for console
    },
    // UI colors
    ui: {
      ...baseTheme.colors.ui,
      background: '#0A1A2A', // Deep blue background
      panelBg: 'rgba(20, 40, 80, 0.7)', // Translucent blue panel
      darkCyber: '#051525', // Darker blue background
      border: 'rgba(100, 200, 255, 0.5)', // Glowing blue border
      text: {
        primary: '#80DDFF', // Bright blue text
        secondary: '#99BBEE', // Soft blue text
        heading: '#FFFFFF', // White headings
        bright: '#FFFFFF', // White text
        success: '#80FFBB', // Mint green success
        warning: '#FFEE99', // Soft yellow warning
        error: '#FF8899', // Soft red error
      },
      grid: 'rgba(50, 100, 200, 0.3)', // Translucent blue grid
      particle: '#FFFFFF', // White particles
    },
    // Gradients
    gradients: {
      ringGradient: {
        start: 'rgba(20, 60, 120, 0.8)',
        end: 'rgba(10, 30, 60, 0.9)',
      },
    },
  },

  // Shadows
  shadows: {
    ...baseTheme.shadows,
    glow: '0 0 15px rgba(100, 200, 255, 0.4), inset 0 0 20px rgba(100, 200, 255, 0.2)',
    textGlow: '0 0 10px rgba(255, 255, 255, 0.8)',
    nodeGlow: '0 0 8px',
    buttonGlow: '0 0 10px',
    panelGlow: '0 0 20px rgba(100, 200, 255, 0.3), inset 0 0 30px rgba(100, 200, 255, 0.1)',
  },

  // Console specific theming
  console: {
    backgroundColor: 'rgba(5, 15, 35, 0.9)', // Darker blue background with opacity
    borderColor: 'rgba(100, 200, 255, 0.5)', // Holographic border
    scrollbar: {
      width: '8px',
      trackBg: 'rgba(0, 20, 40, 0.3)',
      trackBorderColor: 'rgba(100, 200, 255, 0.2)',
      thumbBg: 'rgba(100, 200, 255, 0.7)',
      thumbGradientStart: 'rgba(100, 200, 255, 0.8)',
      thumbGradientEnd: 'rgba(100, 200, 255, 0.3)',
      thumbHoverGradientStart: 'rgba(100, 200, 255, 1)',
      thumbHoverGradientEnd: 'rgba(100, 200, 255, 0.5)',
      thumbShadow: '0 0 5px rgba(100, 200, 255, 0.7)',
      thumbHoverShadow: '0 0 8px rgba(100, 200, 255, 0.9)',
      borderRadius: '4px',
    },
    logs: {
      animation: {
        duration: '300ms',
        timing: 'ease-out',
      },
      height: '216px', // Slightly taller
      timestamp: {
        color: 'rgba(160, 210, 250, 0.8)',
      },
      message: {
        info: '#FFFFFF', // Bright white text for info messages
        success: '#80FFBB', // Mint green success
        warning: '#FFEE99', // Soft yellow warning
        error: '#FF8899', // Soft red error
      },
    },
    indicator: {
      size: '3px',
      color: '#CC99FF', // Lavender for console indicator dot
      glow: '0 0 6px #CC99FF',
    },
  },

  // Hash Ring specific theming
  hashRing: {
    ...baseTheme.hashRing,
    // Ring appearance
    ring: {
      ...baseTheme.hashRing.ring,
      outlineColor: 'rgba(100, 200, 255, 0.8)',
      outlineWidth: 2,
      outerCircleColor: 'rgba(100, 200, 255, 0.4)',
      outerCircleWidth: 1,
      outerCircleDashArray: '5,8',
      innerCircleColor: 'rgba(100, 200, 255, 0.6)',
      innerCircleWidth: 1,
      innerCircleDashArray: '3,5',
      backgroundColor: 'rgba(10, 30, 60, 0.8)',
      gridColor: 'rgba(50, 100, 200, 0.2)',
      gridWidth: 0.5,
      hashTextColor: 'rgba(200, 230, 255, 0.8)',
      hashTextSize: 10,
    },
    // Node appearance
    node: {
      ...baseTheme.hashRing.node,
      size: 7,
      hoverSize: 9,
      strokeColor: 'rgba(255, 255, 255, 0.8)',
      strokeWidth: 2,
      defaultColor: 'rgba(100, 200, 255, 0.8)',
      glowFilter: 'url(#nodeGlow)',
      glowDeviation: 2.5,
      glowColor: 'rgba(150, 220, 255, 0.9)',
    },
    // Segment appearance
    segment: {
      ...baseTheme.hashRing.segment,
      width: 30,
      strokeWidth: 1,
      strokeOpacity: 0.6,
      hoverOpacity: 0.9,
      gradientInnerOpacity: 0.4,
      gradientOuterOpacity: 0.1,
      boundaryLineWidth: 0.5,
      boundaryLineOpacity: 0.5,
      boundaryLineDashArray: '3,6',
    },
    // Particle appearance
    particle: {
      ...baseTheme.hashRing.particle,
      color: '#FFFFFF',
      size: 6,
      strokeColor: 'rgba(150, 220, 255, 0.8)',
      strokeWidth: 2,
      glowDeviation: 3,
      trailWidth: 6,
      trailOpacity: 0.6,
      trailLength: 0.01,
      animationDuration: 1000,
    },
    // Hit effect appearance
    hitEffect: {
      ...baseTheme.hashRing.hitEffect,
      color: 'rgba(255, 255, 255, 0.9)',
      width: 15,
      strokeWidth: 3,
      opacity: 0.7,
      duration: 800,
      initialRadius: 8,
      finalRadius: 30,
      initialOpacity: 0.9,
      innerDotSize: 10,
      innerDotOpacity: 0.9,
      innerDotDuration: 400,
    },
    // Origin point appearance
    originPoint: {
      ...baseTheme.hashRing.originPoint,
      size: 5,
      color: 'rgba(255, 255, 255, 0.9)',
      strokeColor: 'rgba(150, 220, 255, 0.8)',
      strokeWidth: 2,
      labelOffset: 10,
      labelColor: 'rgba(200, 230, 255, 0.9)',
      labelSize: 10,
    },
    // Preview indicator appearance
    previewIndicator: {
      ...baseTheme.hashRing.previewIndicator,
      pathColor: 'rgba(255, 255, 255, 0.8)',
      pathWidth: 2,
      pathDashArray: '6,8',
      opacity: 0.8,
      animationDuration: 2500,
      dotSize: 6,
      dotColor: 'rgba(255, 255, 255, 0.9)',
      blinkDuration: 1200,
      minOpacity: 0.4,
      maxOpacity: 1.0,
    },
    // Tooltip appearance
    tooltip: {
      ...baseTheme.hashRing.tooltip,
      width: 220,
      height: 35,
      backgroundColor: 'rgba(20, 40, 80, 0.85)',
      borderColor: 'rgba(100, 200, 255, 0.7)',
      borderWidth: 1,
      borderRadius: 4,
      textColor: '#FFFFFF',
      fontSize: 12,
    },
    // Legend appearance
    legend: {
      ...baseTheme.hashRing.legend,
      width: 180,
      bottom: 15,
      right: 15,
      padding: 12,
      backgroundColor: 'rgba(20, 40, 80, 0.85)',
      borderColor: 'rgba(100, 200, 255, 0.7)',
      borderWidth: 1,
      borderRadius: 4,
      textColor: '#FFFFFF',
      fontSize: 11,
    },
    // Status indicator appearance
    statusIndicator: {
      ...baseTheme.hashRing.statusIndicator,
      top: 15,
      right: 15,
      padding: '10px 15px',
      backgroundColor: 'rgba(20, 40, 80, 0.85)',
      borderColor: 'rgba(100, 200, 255, 0.7)',
      borderWidth: 1,
      borderRadius: 4,
      textColor: '#FFFFFF',
      fontSize: 12,
      activeColor: 'rgba(100, 255, 180, 0.9)',
      inactiveColor: 'rgba(255, 100, 150, 0.9)',
    },
  },
};

export default holographicTheme;
