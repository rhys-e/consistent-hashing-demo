// jest.config.js
export default {
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest', // Babel transpiles JS so "import" works
  },
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    // The theme module selects with `import.meta.env`, which has no CommonJS
    // equivalent. See test/themeStub.js.
    '^(?:\\.{1,2}/)+themes$': '<rootDir>/test/themeStub.js',
  },
  // scratch/ holds throwaway render harnesses, which are not part of the suite.
  testPathIgnorePatterns: ['/node_modules/', '/scratch/'],
};
