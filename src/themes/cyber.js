const cyberTheme = {
  // Color palette
  colors: {
    // Main cyber colors
    primary: {
      neoRed: '#E15759', // Neo-Tokyo Red (first node)
      cyberBlue: '#4E79A7', // Cyber Blue (second node)
      matrixGreen: '#59A14F', // Matrix Green
      neonOrange: '#F28E2B', // Neon Orange
      synthwavePurple: '#B07AA1', // Synthwave Purple
      tealHologram: '#76B7B2', // Teal Hologram
      softNeonPink: '#FF9DA7', // Soft Neon Pink
      rustedBronze: '#9D7660', // Rusted Bronze
      chromeSilver: '#BAB0AC', // Chrome Silver
      magentaHaze: '#D37295', // Magenta Haze
      electricAmber: '#FFBE7D', // Electric Amber
      digitalLime: '#59A14F', // Digital Lime
      cyberdeckAqua: '#499894', // Cyberdeck Aqua
      virtualGold: '#F1CE63', // Virtual Gold
      acidYellow: '#B6992D', // Acid Yellow
      terminalGreen: '#86BCB6', // Terminal Green
      holographicPink: '#D4A6C8', // Holographic Pink
      circuitBlue: '#499894', // Circuit Blue
      techBronze: '#9D7660', // Tech Bronze
      augmentedBeige: '#D7B5A6', // Augmented Beige
      circuitPurple: '#B07AA1', // Circuit Purple for console dot
    },
    // UI colors
    ui: {
      background: '#0a0b16', // Main background
      panelBg: '#1d1e33', // Panel background
      darkCyber: '#131525', // Dark background
      border: '#44475a', // Border color
      text: {
        primary: '#8be9fd', // Primary text
        secondary: '#6272a4', // Secondary text
        heading: '#ff79c6', // Heading text
        bright: '#f8f8f2', // Bright text
        success: '#50fa7b', // Success text
        warning: '#f1fa8c', // Warning text
        error: '#ff5555', // Error text
      },
      grid: '#1d1e33', // Grid lines
      particle: '#f1fa8c', // Particle color
    },
    // Button colors
    buttons: {
      success: {
        bg: 'rgba(80, 250, 123, 0.8)',
        border: '#50fa7b',
        shadow: 'rgba(80, 250, 123, 0.3)',
      },
      danger: {
        bg: 'rgba(255, 85, 85, 0.8)',
        border: '#ff5555',
        shadow: 'rgba(255, 85, 85, 0.3)',
      },
      neutral: {
        bg: 'rgba(68, 71, 90, 0.8)',
        border: '#44475a',
        shadow: 'rgba(68, 71, 90, 0.3)',
      },
      purple: {
        bg: 'rgba(189, 147, 249, 0.8)',
        border: '#bd93f9',
        shadow: 'rgba(189, 147, 249, 0.3)',
      },
    },
    // Gradients
    gradients: {
      ringGradient: {
        start: '#1a1c30',
        end: '#131525',
      },
    },
  },

  // Typography
  typography: {
    fontFamily: {
      mono: '"Share Tech Mono", monospace',
      orbitron: '"Orbitron", sans-serif',
      rajdhani: '"Rajdhani", sans-serif',
      system:
        'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    fontSize: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.125rem', // 18px
      xl: '1.25rem', // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem', // 48px
    },
    lineHeight: {
      normal: '1.5',
      tight: '1.25',
      loose: '1.75',
    },
    letterSpacing: {
      normal: 'normal',
      wide: '1px',
      wider: '2px',
      widest: '4px',
    },
  },

  // Spacing
  spacing: {
    0: '0',
    1: '0.25rem', // 4px
    2: '0.5rem', // 8px
    3: '0.75rem', // 12px
    4: '1rem', // 16px
    5: '1.25rem', // 20px
    6: '1.5rem', // 24px
    8: '2rem', // 32px
    10: '2.5rem', // 40px
    12: '3rem', // 48px
  },

  // Borders
  borders: {
    none: 'none',
    thin: '1px solid',
    medium: '1.5px solid',
    thick: '2px solid',
    dashed: '1px dashed',
    dotted: '1px dotted',
  },

  // Shadows
  shadows: {
    glow: '0 0 15px rgba(189, 147, 249, 0.2), inset 0 0 10px rgba(0, 0, 0, 0.4)',
    textGlow: '0 0 10px rgba(255, 121, 198, 0.7)',
    nodeGlow: '0 0 5px',
    buttonGlow: '0 0 7px',
    panelGlow: '0 0 20px rgba(139, 233, 253, 0.15), inset 0 0 30px rgba(0, 0, 0, 0.4)',
  },

  // Animations
  animations: {
    duration: {
      fast: '200ms',
      normal: '300ms',
      slow: '500ms',
      verySlow: '800ms',
    },
    timing: {
      default: 'ease-in-out',
      linear: 'linear',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
    },
  },

  // Layout
  layout: {
    maxWidth: '1200px',
    borderRadius: {
      none: '0',
      sm: '2px',
      md: '4px',
      lg: '8px',
      full: '9999px',
    },
    pagePadding: 64, // 32px padding on each side
    columnGap: 32, // Gap between columns
  },

  // Visualisation specific
  visualisation: {
    svg: {
      widthPercentage: 70, // 70% of available width
      aspectRatio: 1, // Square (1:1 ratio)
      radiusPercentage: 85, // 85% of half the width
    },
    nodes: {
      size: 6,
      strokeWidth: 1.5,
    },
    particles: {
      size: 5,
      speed: 0.002,
      trailLength: 0.01,
      trailWidth: 4,
      trailOpacity: 0.7,
      color: '#f1fa8c',
      strokeColor: '#282a36',
      strokeWidth: 1,
      glowDeviation: 1.5,
      animationDuration: 800,
    },
  },

  // Console specific theming
  console: {
    backgroundColor: '#131525', // Dark background for console
    borderColor: '#44475a', // Border color for console
    scrollbar: {
      width: '8px',
      trackBg: 'rgba(0, 0, 0, 0.2)',
      trackBorderColor: 'rgba(176, 122, 161, 0.2)',
      thumbBg: 'rgb(176, 122, 161)',
      thumbGradientStart: 'rgba(176, 122, 161, 0.8)',
      thumbGradientEnd: 'rgba(176, 122, 161, 0.3)',
      thumbHoverGradientStart: 'rgba(176, 122, 161, 1)',
      thumbHoverGradientEnd: 'rgba(176, 122, 161, 0.5)',
      thumbShadow: '0 0 5px rgba(176, 122, 161, 0.7)',
      thumbHoverShadow: '0 0 8px rgba(176, 122, 161, 0.9)',
      borderRadius: '4px',
    },
    logs: {
      animation: {
        duration: '200ms',
        timing: 'ease-out',
      },
      height: '215px',
      timestamp: {
        color: 'rgba(150, 180, 220, 0.7)',
      },
      message: {
        info: '#f8f8f2', // White text for info messages
        success: '#50fa7b', // Success text
        warning: '#f1fa8c', // Warning text
        error: '#ff5555', // Error text
      },
    },
    indicator: {
      size: '3px',
      color: '#B07AA1', // Circuit Purple for console indicator dot
      glow: '0 0 5px #B07AA1',
    },
  },

  // Hash Ring specific theming
  hashRing: {
    // Ring appearance
    ring: {
      outlineColor: '#44475a',
      outlineWidth: 2,
      outerCircleColor: '#1d1e33',
      outerCircleWidth: 1,
      outerCircleDashArray: '2,4',
      innerCircleColor: '#1d1e33',
      innerCircleWidth: 1,
      innerCircleDashArray: '1,2',
      backgroundColor: '#131525',
      gridColor: '#1d1e33',
      gridWidth: 1,
      hashTextColor: '#6272a4',
      hashTextSize: 9,
    },
    // Node appearance
    node: {
      size: 6,
      hoverSize: 8,
      strokeColor: '#282a36',
      strokeWidth: 1.5,
      defaultColor: '#E15759', // Fallback color if none provided
      glowFilter: 'url(#nodeGlow)',
      glowDeviation: 1.5,
      glowColor: 'rgba(255, 255, 255, 0.7)',
    },
    // Segment appearance
    segment: {
      width: 24, // innerRadius to outerRadius difference
      strokeWidth: 1.5,
      strokeOpacity: 0.8,
      hoverOpacity: 1.0,
      gradientInnerOpacity: 0.5,
      gradientOuterOpacity: 0.1,
      boundaryLineWidth: 1,
      boundaryLineOpacity: 0.9,
      boundaryLineDashArray: '2,3',
    },
    // Particle appearance
    particle: {
      color: '#f1fa8c',
      size: 5,
      strokeColor: '#282a36',
      strokeWidth: 1,
      glowFilter: 'url(#particleGlow)',
      glowDeviation: 1.5,
      trailWidth: 4,
      trailOpacity: 0.7,
      trailLength: 0.01,
      animationDuration: 800,
    },
    // Hit effect appearance
    hitEffect: {
      color: '#f1fa8c',
      width: 12,
      strokeWidth: 2,
      opacity: 0.8,
      duration: 500,
      initialRadius: 6,
      finalRadius: 20,
      initialOpacity: 0.8,
      innerDotSize: 8,
      innerDotOpacity: 0.8,
      innerDotDuration: 300,
      innerDotRepeat: 'infinite',
    },
    // Origin point appearance
    originPoint: {
      size: 4,
      color: '#f1fa8c',
      strokeColor: '#282a36',
      strokeWidth: 1,
      labelOffset: 8,
      labelColor: '#6272a4',
      labelSize: 9,
    },
    // Preview indicator appearance
    previewIndicator: {
      pathColor: '#f1fa8c',
      pathWidth: 1.5,
      pathDashArray: '5,5',
      opacity: 0.7,
      animationDuration: 2000,
      dotSize: 5,
      dotColor: '#f1fa8c',
      blinkDuration: 1500,
      minOpacity: 0.3,
      maxOpacity: 0.9,
    },
    // Tooltip appearance
    tooltip: {
      width: 200,
      height: 30,
      backgroundColor: 'rgba(40, 42, 54, 0.9)',
      borderColor: '#6272a4',
      borderWidth: 1,
      borderRadius: 0,
      textColor: '#f8f8f2',
      fontSize: 11,
    },
    // Legend appearance
    legend: {
      width: 170,
      bottom: 10,
      right: 10,
      padding: 10,
      backgroundColor: 'rgba(29, 30, 51, 0.9)',
      borderColor: '#44475a',
      borderWidth: 1,
      borderRadius: 0,
      textColor: '#f8f8f2',
      fontSize: 10,
    },
    // Status indicator appearance
    statusIndicator: {
      top: 10,
      right: 10,
      padding: '8px 12px',
      backgroundColor: 'rgba(29, 30, 51, 0.9)',
      borderColor: '#44475a',
      borderWidth: 1,
      borderRadius: 0,
      textColor: '#f8f8f2',
      fontSize: 11,
      activeColor: '#50fa7b',
      inactiveColor: '#ff5555',
    },
  },
};

export default cyberTheme;
