/** @type { import('@storybook/react').Preview } */
import '../src/index.css';

const preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        {
          name: 'dark',
          value: '#0a0b16',
        },
        {
          name: 'light',
          value: '#f8f8f2',
        },
      ],
    },
    actions: { argTypesRegex: '^on[A-Z].*' },
    options: {
      storySort: {
        order: ['Introduction', 'Hash Ring', ['Visualization']],
      },
    },
  },
};

export default preview;
