// jest.config.js
export default {
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest', // Babel transpiles your JS so "import" works
  },
};
