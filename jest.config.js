// jest.config.js
export default {
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest', // Babel transpiles JS so "import" works
  },
};
