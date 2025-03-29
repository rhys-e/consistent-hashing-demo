import React, { createContext, useContext } from 'react';
import defaultTheme from '../themes';

export const ThemeContext = createContext(defaultTheme);

export function ThemeProvider({ theme = defaultTheme, children }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return theme;
}

export default ThemeProvider;
