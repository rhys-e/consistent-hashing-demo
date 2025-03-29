import React, { useState, useEffect } from 'react';
import { useTheme } from './ThemeProvider';
import { applyThemeToRoot } from '../utils/themeUtils';
import defaultTheme from '../theme';

const darkTheme = {
  ...defaultTheme,
  colors: {
    ...defaultTheme.colors,
    ui: {
      ...defaultTheme.colors.ui,
      background: '#000000',
      panelBg: '#121212',
      darkCyber: '#0a0a0a',
      border: '#333333',
    },
  },
};

const lightTheme = {
  ...defaultTheme,
  colors: {
    ...defaultTheme.colors,
    ui: {
      ...defaultTheme.colors.ui,
      background: '#f0f0f0',
      panelBg: '#ffffff',
      darkCyber: '#e0e0e0',
      border: '#cccccc',
      text: {
        ...defaultTheme.colors.ui.text,
        primary: '#0984e3',
        secondary: '#636e72',
        heading: '#6c5ce7',
        bright: '#2d3436',
      },
    },
  },
};

const themes = {
  default: defaultTheme,
  dark: darkTheme,
  light: lightTheme,
};

export function ThemeSwitcher() {
  const currentTheme = useTheme();
  const [activeTheme, setActiveTheme] = useState('default');

  const changeTheme = themeName => {
    if (themes[themeName]) {
      setActiveTheme(themeName);
      applyThemeToRoot(themes[themeName]);
    }
  };

  return (
    <div className="theme-switcher fixed right-4 top-4 z-50">
      <div className="flex gap-2">
        {Object.keys(themes).map(themeName => (
          <button
            key={themeName}
            onClick={() => changeTheme(themeName)}
            className={`rounded-sm px-3 py-1 text-xs ${
              activeTheme === themeName
                ? 'border-2 border-ui-text-heading'
                : 'border-ui-border border opacity-70'
            }`}
            style={{
              backgroundColor: themes[themeName].colors.ui.panelBg,
              color: themes[themeName].colors.ui.text.primary,
            }}
          >
            {themeName}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ThemeSwitcher;
