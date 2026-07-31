/**
 * The theme, for tests.
 *
 * `src/themes/index.js` picks a theme with `import.meta.env`, which babel-jest
 * cannot transpile for CommonJS — so every test touching anything themed used to
 * carry its own hand-written copy of the palette. Those copies drifted: a test
 * would pass with a colour the app does not actually use, or fail because a key
 * had been left out of one mock and not another.
 *
 * Mapped in place of the theme module by `jest.config.js`, and re-exporting a real
 * theme rather than a fixture, so the values under test are values that exist.
 */
import cyberTheme from '../src/themes/cyber';

export default cyberTheme;
