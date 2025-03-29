import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Get the selected theme from environment variable or use default
const THEME = process.env.VITE_THEME || 'holographic';

const ReactCompilerConfig = {
  sources: filename => {
    return filename.indexOf('src/') !== -1;
  },
};

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', ReactCompilerConfig]],
      },
    }),
  ],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  define: {
    'import.meta.env.VITE_THEME': JSON.stringify(THEME),
  },
});
