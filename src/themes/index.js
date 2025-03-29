import cyberTheme from './cyber';
import holographicTheme from './holographic';

const themes = {
  cyber: cyberTheme,
  holographic: holographicTheme,
};

const SELECTED_THEME = import.meta.env.VITE_THEME || 'holographic';

export default themes[SELECTED_THEME] || holographicTheme;
