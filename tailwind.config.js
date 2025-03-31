import theme from './src/themes/index.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        md: '950px',
      },
      colors: {
        // Primary colors from theme
        'neo-red': theme.colors.primary.neoRed,
        'cyber-blue': theme.colors.primary.cyberBlue,
        'matrix-green': theme.colors.primary.matrixGreen,
        'neon-orange': theme.colors.primary.neonOrange,
        'synthwave-purple': theme.colors.primary.synthwavePurple,
        'teal-hologram': theme.colors.primary.tealHologram,
        'soft-neon-pink': theme.colors.primary.softNeonPink,
        'rusted-bronze': theme.colors.primary.rustedBronze,
        'chrome-silver': theme.colors.primary.chromeSilver,
        'magenta-haze': theme.colors.primary.magentaHaze,
        'electric-amber': theme.colors.primary.electricAmber,
        'digital-lime': theme.colors.primary.digitalLime,
        'cyberdeck-aqua': theme.colors.primary.cyberdeckAqua,
        'virtual-gold': theme.colors.primary.virtualGold,
        'acid-yellow': theme.colors.primary.acidYellow,
        'terminal-green': theme.colors.primary.terminalGreen,
        'holographic-pink': theme.colors.primary.holographicPink,
        'circuit-blue': theme.colors.primary.circuitBlue,
        'tech-bronze': theme.colors.primary.techBronze,
        'augmented-beige': theme.colors.primary.augmentedBeige,
        'circuit-purple': theme.colors.primary.circuitPurple,

        // UI colors from theme
        'body-bg': theme.colors.ui.background,
        'body-text': theme.colors.ui.text.primary,
        'heading-color': theme.colors.ui.text.heading,
        'range-bg': theme.colors.ui.border,
        'range-thumb': theme.colors.ui.text.primary,

        // UI text colors
        'ui-text-primary': theme.colors.ui.text.primary,
        'ui-text-secondary': theme.colors.ui.text.secondary,
        'ui-text-heading': theme.colors.ui.text.heading,
        'ui-text-bright': theme.colors.ui.text.bright,
        'ui-text-success': theme.colors.ui.text.success,
        'ui-text-warning': theme.colors.ui.text.warning,
        'ui-text-error': theme.colors.ui.text.error,

        // Other UI colors
        'ui-grid': theme.colors.ui.grid,
        'ui-particle': theme.colors.ui.particle,

        // Button colors
        'btn-success-bg': theme.colors.buttons.success.bg,
        'btn-success-border': theme.colors.buttons.success.border,
        'btn-success-shadow': theme.colors.buttons.success.shadow,
        'btn-danger-bg': theme.colors.buttons.danger.bg,
        'btn-danger-border': theme.colors.buttons.danger.border,
        'btn-danger-shadow': theme.colors.buttons.danger.shadow,
        'btn-neutral-bg': theme.colors.buttons.neutral.bg,
        'btn-neutral-border': theme.colors.buttons.neutral.border,
        'btn-neutral-shadow': theme.colors.buttons.neutral.shadow,
        'btn-purple-bg': theme.colors.buttons.purple.bg,
        'btn-purple-border': theme.colors.buttons.purple.border,
        'btn-purple-shadow': theme.colors.buttons.purple.shadow,

        // Console colors
        'console-bg': theme.console.backgroundColor,
        'console-border': theme.console.borderColor,
        'console-scrollbar-track': theme.console.scrollbar.trackBg,
        'console-scrollbar-track-border': theme.console.scrollbar.trackBorderColor,
        'console-scrollbar-thumb': theme.console.scrollbar.thumbBg,
        'console-scrollbar-thumb-gradient-start': theme.console.scrollbar.thumbGradientStart,
        'console-scrollbar-thumb-gradient-end': theme.console.scrollbar.thumbGradientEnd,
        'console-scrollbar-thumb-hover-gradient-start':
          theme.console.scrollbar.thumbHoverGradientStart,
        'console-scrollbar-thumb-hover-gradient-end': theme.console.scrollbar.thumbHoverGradientEnd,
        'console-timestamp': theme.console.logs.timestamp.color,
        'console-message-info': theme.console.logs.message.info,
        'console-message-success': theme.console.logs.message.success,
        'console-message-warning': theme.console.logs.message.warning,
        'console-message-error': theme.console.logs.message.error,
        'console-indicator': theme.console.indicator.color,

        // Hash Ring colors
        'ring-outline': theme.hashRing.ring.outlineColor,
        'ring-outer-circle': theme.hashRing.ring.outerCircleColor,
        'ring-inner-circle': theme.hashRing.ring.innerCircleColor,
        'ring-bg': theme.hashRing.ring.backgroundColor,
        'ring-grid': theme.hashRing.ring.gridColor,
        'ring-hash-text': theme.hashRing.ring.hashTextColor,
        'node-stroke': theme.hashRing.node.strokeColor,
        'node-default': theme.hashRing.node.defaultColor,
        'node-glow': theme.hashRing.node.glowColor,
        'particle-color': theme.hashRing.particle.color,
        'particle-stroke': theme.hashRing.particle.strokeColor,
        'hit-effect': theme.hashRing.hitEffect.color,
        'origin-color': theme.hashRing.originPoint.color,
        'origin-stroke': theme.hashRing.originPoint.strokeColor,
        'origin-label': theme.hashRing.originPoint.labelColor,
        'preview-path': theme.hashRing.previewIndicator.pathColor,
        'preview-dot': theme.hashRing.previewIndicator.dotColor,
        'tooltip-bg': theme.hashRing.tooltip.backgroundColor,
        'tooltip-border': theme.hashRing.tooltip.borderColor,
        'tooltip-text': theme.hashRing.tooltip.textColor,
        'legend-bg': theme.hashRing.legend.backgroundColor,
        'legend-border': theme.hashRing.legend.borderColor,
        'legend-text': theme.hashRing.legend.textColor,
        'status-active': theme.hashRing.statusIndicator.activeColor,
        'status-inactive': theme.hashRing.statusIndicator.inactiveColor,
        'status-text': theme.hashRing.statusIndicator.textColor,
      },
      fontFamily: {
        mono: [theme.typography.fontFamily.mono],
        orbitron: [theme.typography.fontFamily.orbitron],
        rajdhani: [theme.typography.fontFamily.rajdhani],
        system: theme.typography.fontFamily.system.split(', '),
      },
      backgroundColor: {
        'dark-cyber': theme.colors.ui.darkCyber,
        'panel-bg': theme.colors.ui.panelBg,
        'ring-bg': theme.hashRing.ring.backgroundColor,
        'tooltip-bg': theme.hashRing.tooltip.backgroundColor,
        'legend-bg': theme.hashRing.legend.backgroundColor,
        'status-bg': theme.hashRing.statusIndicator.backgroundColor,
        'console-bg': theme.console.backgroundColor,
      },
      borderColor: {
        'cyber-border': theme.colors.ui.border,
        'ring-outline': theme.hashRing.ring.outlineColor,
        'tooltip-border': theme.hashRing.tooltip.borderColor,
        'legend-border': theme.hashRing.legend.borderColor,
        'status-border': theme.hashRing.statusIndicator.borderColor,
        'console-border': theme.console.borderColor,
      },
      strokeWidth: {
        'ring-outline': theme.hashRing.ring.outlineWidth,
        'ring-outer': theme.hashRing.ring.outerCircleWidth,
        'ring-inner': theme.hashRing.ring.innerCircleWidth,
        'ring-grid': theme.hashRing.ring.gridWidth,
        node: theme.hashRing.node.strokeWidth,
        segment: theme.hashRing.segment.strokeWidth,
        'segment-boundary': theme.hashRing.segment.boundaryLineWidth,
        particle: theme.hashRing.particle.strokeWidth,
        'hit-effect': theme.hashRing.hitEffect.strokeWidth,
        origin: theme.hashRing.originPoint.strokeWidth,
        preview: theme.hashRing.previewIndicator.pathWidth,
        tooltip: theme.hashRing.tooltip.borderWidth,
        legend: theme.hashRing.legend.borderWidth,
        status: theme.hashRing.statusIndicator.borderWidth,
      },
      fontSize: {
        ...theme.typography.fontSize,
        'hash-text': theme.hashRing.ring.hashTextSize,
        'tooltip-text': theme.hashRing.tooltip.fontSize,
        'legend-text': theme.hashRing.legend.fontSize,
        'status-text': theme.hashRing.statusIndicator.fontSize,
        'origin-label': theme.hashRing.originPoint.labelSize,
      },
      spacing: theme.spacing,
      lineHeight: theme.typography.lineHeight,
      letterSpacing: theme.typography.letterSpacing,
      borderRadius: theme.layout.borderRadius,
      transitionDuration: {
        fast: theme.animations.duration.fast,
        normal: theme.animations.duration.normal,
        slow: theme.animations.duration.slow,
        'very-slow': theme.animations.duration.verySlow,
        'particle-anim': `${theme.hashRing.particle.animationDuration}ms`,
        'hit-effect': `${theme.hashRing.hitEffect.duration}ms`,
        'preview-anim': `${theme.hashRing.previewIndicator.animationDuration}ms`,
        'preview-blink': `${theme.hashRing.previewIndicator.blinkDuration}ms`,
        'console-anim': theme.console.logs.animation.duration,
      },
      transitionTimingFunction: {
        default: theme.animations.timing.default,
        linear: theme.animations.timing.linear,
        'ease-in': theme.animations.timing.easeIn,
        'ease-out': theme.animations.timing.easeOut,
        'console-timing': theme.console.logs.animation.timing,
      },
      opacity: {
        'segment-stroke': theme.hashRing.segment.strokeOpacity,
        'segment-hover': theme.hashRing.segment.hoverOpacity,
        'segment-gradient-inner': theme.hashRing.segment.gradientInnerOpacity,
        'segment-gradient-outer': theme.hashRing.segment.gradientOuterOpacity,
        'segment-boundary': theme.hashRing.segment.boundaryLineOpacity,
        'particle-trail': theme.hashRing.particle.trailOpacity,
        'hit-effect': theme.hashRing.hitEffect.opacity,
        'hit-inner-dot': theme.hashRing.hitEffect.innerDotOpacity,
        'preview-min': theme.hashRing.previewIndicator.minOpacity,
        'preview-max': theme.hashRing.previewIndicator.maxOpacity,
        preview: theme.hashRing.previewIndicator.opacity,
      },
      width: {
        legend: theme.hashRing.legend.width,
        tooltip: theme.hashRing.tooltip.width,
      },
      height: {
        tooltip: theme.hashRing.tooltip.height,
        console: theme.console.logs.height,
      },
      boxShadow: {
        glow: theme.shadows.glow,
        'text-glow': theme.shadows.textGlow,
        'node-glow': theme.shadows.nodeGlow,
        'button-glow': theme.shadows.buttonGlow,
        'panel-glow': theme.shadows.panelGlow,
        'inner-glow': 'inset 0 0 30px rgba(0, 0, 0, 0.4)',
        'console-scrollbar': theme.console.scrollbar.thumbShadow,
        'console-scrollbar-hover': theme.console.scrollbar.thumbHoverShadow,
        'console-indicator': theme.console.indicator.glow,
      },
      animation: {
        pulse: `pulse ${theme.hashRing.hitEffect.duration}ms ease-out forwards`,
        dash: `dash ${theme.hashRing.previewIndicator.animationDuration}ms linear infinite`,
        blink: `blink ${theme.hashRing.previewIndicator.blinkDuration}ms ease-in-out infinite`,
        'node-hit-pulse': `nodeHitPulse 0.5s ease-out`,
        glow: 'glow 2s ease-in-out infinite',
        'particle-blink': `blink ${theme.hashRing.particle.animationDuration}ms ease-in-out infinite`,
        'hit-dot-blink': `blink ${theme.hashRing.hitEffect.innerDotDuration}ms ease-in-out ${theme.hashRing.hitEffect.innerDotRepeat}`,
        'console-fade': `fadeIn ${theme.console.logs.animation.duration} ${theme.console.logs.animation.timing}`,
      },
      keyframes: {
        pulse: {
          '0%': {
            r: `${theme.hashRing.hitEffect.initialRadius}px`,
            opacity: theme.hashRing.hitEffect.initialOpacity,
          },
          '100%': {
            r: `${theme.hashRing.hitEffect.finalRadius}px`,
            opacity: 0,
          },
        },
        dash: {
          to: {
            strokeDashoffset: '-40',
          },
        },
        blink: {
          '0%': {
            opacity: theme.hashRing.previewIndicator.minOpacity,
          },
          '50%': {
            opacity: theme.hashRing.previewIndicator.maxOpacity,
          },
          '100%': {
            opacity: theme.hashRing.previewIndicator.minOpacity,
          },
        },
        glow: {
          '0%': {
            filter: `drop-shadow(0 0 2px ${theme.hashRing.node.glowColor})`,
          },
          '50%': {
            filter: `drop-shadow(0 0 5px ${theme.hashRing.node.glowColor})`,
          },
          '100%': {
            filter: `drop-shadow(0 0 2px ${theme.hashRing.node.glowColor})`,
          },
        },
        nodeHitPulse: {
          '0%': {
            r: `${theme.hashRing.node.size}px`,
            filter: `drop-shadow(0 0 3px ${theme.hashRing.hitEffect.color})`,
          },
          '50%': {
            r: `${theme.hashRing.node.size * 1.5}px`,
            filter: `drop-shadow(0 0 10px ${theme.hashRing.hitEffect.color})`,
          },
          '100%': {
            r: `${theme.hashRing.node.size}px`,
            filter: `drop-shadow(0 0 3px ${theme.hashRing.hitEffect.color})`,
          },
        },
        fadeIn: {
          from: {
            opacity: 0,
            transform: 'translateY(2px)',
          },
          to: {
            opacity: 1,
            transform: 'translateY(0)',
          },
        },
      },
    },
  },
  plugins: [
    function ({ addBase }) {
      addBase({
        ':root': {
          // Colors - UI
          '--colors-ui-background': theme.colors.ui.background,
          '--colors-ui-panel-bg': theme.colors.ui.panelBg,
          '--colors-ui-dark-cyber': theme.colors.ui.darkCyber,
          '--colors-ui-border': theme.colors.ui.border,
          '--colors-ui-grid': theme.colors.ui.grid,
          '--colors-ui-particle': theme.colors.ui.particle,
          '--colors-ui-text-primary': theme.colors.ui.text.primary,
          '--colors-ui-text-secondary': theme.colors.ui.text.secondary,
          '--colors-ui-text-heading': theme.colors.ui.text.heading,
          '--colors-ui-text-bright': theme.colors.ui.text.bright,
          '--colors-ui-text-success': theme.colors.ui.text.success,
          '--colors-ui-text-warning': theme.colors.ui.text.warning,
          '--colors-ui-text-error': theme.colors.ui.text.error,

          // Colors - Primary
          '--colors-primary-neo-red': theme.colors.primary.neoRed,
          '--colors-primary-cyber-blue': theme.colors.primary.cyberBlue,
          '--colors-primary-matrix-green': theme.colors.primary.matrixGreen,
          '--colors-primary-neon-orange': theme.colors.primary.neonOrange,
          '--colors-primary-synthwave-purple': theme.colors.primary.synthwavePurple,
          '--colors-primary-teal-hologram': theme.colors.primary.tealHologram,
          '--colors-primary-soft-neon-pink': theme.colors.primary.softNeonPink,
          '--colors-primary-rusted-bronze': theme.colors.primary.rustedBronze,
          '--colors-primary-chrome-silver': theme.colors.primary.chromeSilver,
          '--colors-primary-magenta-haze': theme.colors.primary.magentaHaze,
          '--colors-primary-electric-amber': theme.colors.primary.electricAmber,
          '--colors-primary-digital-lime': theme.colors.primary.digitalLime,
          '--colors-primary-cyberdeck-aqua': theme.colors.primary.cyberdeckAqua,
          '--colors-primary-virtual-gold': theme.colors.primary.virtualGold,
          '--colors-primary-acid-yellow': theme.colors.primary.acidYellow,
          '--colors-primary-terminal-green': theme.colors.primary.terminalGreen,
          '--colors-primary-holographic-pink': theme.colors.primary.holographicPink,
          '--colors-primary-circuit-blue': theme.colors.primary.circuitBlue,
          '--colors-primary-tech-bronze': theme.colors.primary.techBronze,
          '--colors-primary-augmented-beige': theme.colors.primary.augmentedBeige,
          '--colors-primary-circuit-purple': theme.colors.primary.circuitPurple,

          // Colors - Buttons
          '--colors-buttons-success-bg': theme.colors.buttons.success.bg,
          '--colors-buttons-success-border': theme.colors.buttons.success.border,
          '--colors-buttons-success-shadow': theme.colors.buttons.success.shadow,
          '--colors-buttons-danger-bg': theme.colors.buttons.danger.bg,
          '--colors-buttons-danger-border': theme.colors.buttons.danger.border,
          '--colors-buttons-danger-shadow': theme.colors.buttons.danger.shadow,
          '--colors-buttons-neutral-bg': theme.colors.buttons.neutral.bg,
          '--colors-buttons-neutral-border': theme.colors.buttons.neutral.border,
          '--colors-buttons-neutral-shadow': theme.colors.buttons.neutral.shadow,
          '--colors-buttons-purple-bg': theme.colors.buttons.purple.bg,
          '--colors-buttons-purple-border': theme.colors.buttons.purple.border,
          '--colors-buttons-purple-shadow': theme.colors.buttons.purple.shadow,

          // Hash Ring
          '--hash-ring-ring-outline-color': theme.hashRing.ring.outlineColor,
          '--hash-ring-ring-outer-circle-color': theme.hashRing.ring.outerCircleColor,
          '--hash-ring-ring-inner-circle-color': theme.hashRing.ring.innerCircleColor,
          '--hash-ring-ring-background-color': theme.hashRing.ring.backgroundColor,
          '--hash-ring-ring-grid-color': theme.hashRing.ring.gridColor,
          '--hash-ring-ring-hash-text-color': theme.hashRing.ring.hashTextColor,
          '--hash-ring-ring-outline-width': theme.hashRing.ring.outlineWidth,
          '--hash-ring-ring-outer-circle-width': theme.hashRing.ring.outerCircleWidth,
          '--hash-ring-ring-inner-circle-width': theme.hashRing.ring.innerCircleWidth,
          '--hash-ring-ring-grid-width': theme.hashRing.ring.gridWidth,
          '--hash-ring-ring-hash-text-size': theme.hashRing.ring.hashTextSize,

          // Hash Ring - Nodes
          '--hash-ring-node-stroke-color': theme.hashRing.node.strokeColor,
          '--hash-ring-node-default-color': theme.hashRing.node.defaultColor,
          '--hash-ring-node-glow-color': theme.hashRing.node.glowColor,
          '--hash-ring-node-stroke-width': theme.hashRing.node.strokeWidth,
          '--hash-ring-node-size': `${theme.hashRing.node.size}px`,

          // Hash Ring - Segments
          '--hash-ring-segment-stroke-width': theme.hashRing.segment.strokeWidth,
          '--hash-ring-segment-boundary-line-width': theme.hashRing.segment.boundaryLineWidth,
          '--hash-ring-segment-stroke-opacity': theme.hashRing.segment.strokeOpacity,
          '--hash-ring-segment-hover-opacity': theme.hashRing.segment.hoverOpacity,
          '--hash-ring-segment-gradient-inner-opacity': theme.hashRing.segment.gradientInnerOpacity,
          '--hash-ring-segment-gradient-outer-opacity': theme.hashRing.segment.gradientOuterOpacity,
          '--hash-ring-segment-boundary-line-opacity': theme.hashRing.segment.boundaryLineOpacity,

          // Hash Ring - Particles
          '--hash-ring-particle-color': theme.hashRing.particle.color,
          '--hash-ring-particle-stroke-color': theme.hashRing.particle.strokeColor,
          '--hash-ring-particle-stroke-width': theme.hashRing.particle.strokeWidth,
          '--hash-ring-particle-trail-opacity': theme.hashRing.particle.trailOpacity,
          '--hash-ring-particle-animation-duration': `${theme.hashRing.particle.animationDuration}ms`,

          // Hash Ring - Hit Effect
          '--hash-ring-hit-effect-color': theme.hashRing.hitEffect.color,
          '--hash-ring-hit-effect-stroke-width': theme.hashRing.hitEffect.strokeWidth,
          '--hash-ring-hit-effect-opacity': theme.hashRing.hitEffect.opacity,
          '--hash-ring-hit-effect-inner-dot-opacity': theme.hashRing.hitEffect.innerDotOpacity,
          '--hash-ring-hit-effect-initial-radius': `${theme.hashRing.hitEffect.initialRadius}px`,
          '--hash-ring-hit-effect-final-radius': `${theme.hashRing.hitEffect.finalRadius}px`,
          '--hash-ring-hit-effect-initial-opacity': theme.hashRing.hitEffect.initialOpacity,
          '--hash-ring-hit-effect-duration': `${theme.hashRing.hitEffect.duration}ms`,
          '--hash-ring-hit-effect-inner-dot-duration': `${theme.hashRing.hitEffect.innerDotDuration}ms`,
          '--hash-ring-hit-effect-inner-dot-repeat': theme.hashRing.hitEffect.innerDotRepeat,

          // Hash Ring - Origin Point
          '--hash-ring-origin-point-color': theme.hashRing.originPoint.color,
          '--hash-ring-origin-point-stroke-color': theme.hashRing.originPoint.strokeColor,
          '--hash-ring-origin-point-label-color': theme.hashRing.originPoint.labelColor,
          '--hash-ring-origin-point-stroke-width': theme.hashRing.originPoint.strokeWidth,
          '--hash-ring-origin-point-label-size': theme.hashRing.originPoint.labelSize,

          // Hash Ring - Preview Indicator
          '--hash-ring-preview-indicator-path-color': theme.hashRing.previewIndicator.pathColor,
          '--hash-ring-preview-indicator-dot-color': theme.hashRing.previewIndicator.dotColor,
          '--hash-ring-preview-indicator-path-width': theme.hashRing.previewIndicator.pathWidth,
          '--hash-ring-preview-indicator-min-opacity': theme.hashRing.previewIndicator.minOpacity,
          '--hash-ring-preview-indicator-max-opacity': theme.hashRing.previewIndicator.maxOpacity,
          '--hash-ring-preview-indicator-opacity': theme.hashRing.previewIndicator.opacity,
          '--hash-ring-preview-indicator-animation-duration': `${theme.hashRing.previewIndicator.animationDuration}ms`,
          '--hash-ring-preview-indicator-blink-duration': `${theme.hashRing.previewIndicator.blinkDuration}ms`,

          // Hash Ring - Tooltip
          '--hash-ring-tooltip-background-color': theme.hashRing.tooltip.backgroundColor,
          '--hash-ring-tooltip-border-color': theme.hashRing.tooltip.borderColor,
          '--hash-ring-tooltip-text-color': theme.hashRing.tooltip.textColor,
          '--hash-ring-tooltip-border-width': theme.hashRing.tooltip.borderWidth,
          '--hash-ring-tooltip-font-size': theme.hashRing.tooltip.fontSize,
          '--hash-ring-tooltip-width': theme.hashRing.tooltip.width,
          '--hash-ring-tooltip-height': theme.hashRing.tooltip.height,

          // Hash Ring - Legend
          '--hash-ring-legend-background-color': theme.hashRing.legend.backgroundColor,
          '--hash-ring-legend-border-color': theme.hashRing.legend.borderColor,
          '--hash-ring-legend-text-color': theme.hashRing.legend.textColor,
          '--hash-ring-legend-border-width': theme.hashRing.legend.borderWidth,
          '--hash-ring-legend-font-size': theme.hashRing.legend.fontSize,
          '--hash-ring-legend-width': theme.hashRing.legend.width,

          // Hash Ring - Status Indicator
          '--hash-ring-status-indicator-active-color': theme.hashRing.statusIndicator.activeColor,
          '--hash-ring-status-indicator-inactive-color':
            theme.hashRing.statusIndicator.inactiveColor,
          '--hash-ring-status-indicator-text-color': theme.hashRing.statusIndicator.textColor,
          '--hash-ring-status-indicator-background-color':
            theme.hashRing.statusIndicator.backgroundColor,
          '--hash-ring-status-indicator-border-color': theme.hashRing.statusIndicator.borderColor,
          '--hash-ring-status-indicator-border-width': theme.hashRing.statusIndicator.borderWidth,
          '--hash-ring-status-indicator-font-size': theme.hashRing.statusIndicator.fontSize,

          // Console
          '--console-background-color': theme.console.backgroundColor,
          '--console-border-color': theme.console.borderColor,
          '--console-logs-height': theme.console.logs.height,
          '--console-logs-animation-duration': theme.console.logs.animation.duration,
          '--console-logs-animation-timing': theme.console.logs.animation.timing,
          '--console-logs-timestamp-color': theme.console.logs.timestamp.color,
          '--console-logs-message-info': theme.console.logs.message.info,
          '--console-logs-message-success': theme.console.logs.message.success,
          '--console-logs-message-warning': theme.console.logs.message.warning,
          '--console-logs-message-error': theme.console.logs.message.error,
          '--console-indicator-color': theme.console.indicator.color,
          '--console-indicator-glow': theme.console.indicator.glow,

          // Console - Scrollbar
          '--console-scrollbar-width': theme.console.scrollbar.width,
          '--console-scrollbar-track-bg': theme.console.scrollbar.trackBg,
          '--console-scrollbar-track-border-color': theme.console.scrollbar.trackBorderColor,
          '--console-scrollbar-thumb-bg': theme.console.scrollbar.thumbBg,
          '--console-scrollbar-thumb-gradient-start': theme.console.scrollbar.thumbGradientStart,
          '--console-scrollbar-thumb-gradient-end': theme.console.scrollbar.thumbGradientEnd,
          '--console-scrollbar-thumb-hover-gradient-start':
            theme.console.scrollbar.thumbHoverGradientStart,
          '--console-scrollbar-thumb-hover-gradient-end':
            theme.console.scrollbar.thumbHoverGradientEnd,
          '--console-scrollbar-thumb-shadow': theme.console.scrollbar.thumbShadow,
          '--console-scrollbar-thumb-hover-shadow': theme.console.scrollbar.thumbHoverShadow,
          '--console-scrollbar-border-radius': theme.console.scrollbar.borderRadius,

          // Typography
          '--typography-font-family-mono': theme.typography.fontFamily.mono,
          '--typography-font-family-orbitron': theme.typography.fontFamily.orbitron,
          '--typography-font-family-rajdhani': theme.typography.fontFamily.rajdhani,
          '--typography-font-family-system': theme.typography.fontFamily.system,

          // Animations
          '--animations-duration-fast': theme.animations.duration.fast,
          '--animations-duration-normal': theme.animations.duration.normal,
          '--animations-duration-slow': theme.animations.duration.slow,
          '--animations-duration-very-slow': theme.animations.duration.verySlow,
          '--animations-timing-default': theme.animations.timing.default,
          '--animations-timing-linear': theme.animations.timing.linear,
          '--animations-timing-ease-in': theme.animations.timing.easeIn,
          '--animations-timing-ease-out': theme.animations.timing.easeOut,

          // Layout
          '--layout-border-radius-sm': theme.layout.borderRadius.sm,
          '--layout-border-radius-md': theme.layout.borderRadius.md,
          '--layout-border-radius-lg': theme.layout.borderRadius.lg,
          '--layout-border-radius-xl': theme.layout.borderRadius.xl,
          '--layout-border-radius-full': theme.layout.borderRadius.full,

          // Shadows
          '--shadows-glow': theme.shadows.glow,
          '--shadows-text-glow': theme.shadows.textGlow,
          '--shadows-node-glow': theme.shadows.nodeGlow,
          '--shadows-button-glow': theme.shadows.buttonGlow,
          '--shadows-panel-glow': theme.shadows.panelGlow,

          // Visualisation
          '--visualisation-svg-width-percentage': `${theme.visualisation.svg.widthPercentage}%`,
          '--visualisation-svg-aspect-ratio': theme.visualisation.svg.aspectRatio,
          '--visualisation-svg-radius-percentage': `${theme.visualisation.svg.radiusPercentage}%`,
        },
      });
    },
  ],
};
