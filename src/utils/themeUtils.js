/**
 * Theme utility functions
 */

/**
 * Applies a theme to the document root
 * @param {Object} theme - The theme object
 */
export function applyThemeToRoot(theme) {
  const root = document.documentElement;

  function applyObject(obj, path = '') {
    Object.entries(obj).forEach(([key, value]) => {
      const newPath = path ? `${path}-${key}` : key;

      if (value !== null && typeof value === 'object') {
        applyObject(value, newPath);
      } else {
        root.style.setProperty(`--${newPath}`, value);
      }
    });
  }

  applyObject(theme);
}

export default {
  applyThemeToRoot,
};
