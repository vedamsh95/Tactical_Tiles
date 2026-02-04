import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        dedupe: ['pixi.js', 'react', 'react-dom', '@pixi/react'],
        alias: {
          '@': path.resolve(__dirname, '.'),
          'pixi.js': path.resolve(__dirname, 'node_modules/pixi.js'),
          '@pixi/math': path.resolve(__dirname, 'node_modules/pixi.js/node_modules/@pixi/math'),
          '@pixi/display': path.resolve(__dirname, 'node_modules/pixi.js/node_modules/@pixi/display'),
          '@pixi/ticker': path.resolve(__dirname, 'node_modules/pixi.js/node_modules/@pixi/ticker'),
          '@pixi/core': path.resolve(__dirname, 'node_modules/pixi.js/node_modules/@pixi/core'),
          '@pixi/events': path.resolve(__dirname, 'node_modules/pixi.js/node_modules/@pixi/events'),
          '@pixi/text-bitmap': path.resolve(__dirname, 'node_modules/pixi.js/node_modules/@pixi/text-bitmap'),
          '@pixi/graphics': path.resolve(__dirname, 'node_modules/pixi.js/node_modules/@pixi/graphics'),
          '@pixi/mesh-extras': path.resolve(__dirname, 'node_modules/pixi.js/node_modules/@pixi/mesh-extras'),
          '@pixi/particle-container': path.resolve(__dirname, 'node_modules/pixi.js/node_modules/@pixi/particle-container'),
          '@pixi/sprite': path.resolve(__dirname, 'node_modules/pixi.js/node_modules/@pixi/sprite'),
          '@pixi/sprite-animated': path.resolve(__dirname, 'node_modules/pixi.js/node_modules/@pixi/sprite-animated'),
          '@pixi/text': path.resolve(__dirname, 'node_modules/pixi.js/node_modules/@pixi/text'),
          '@pixi/sprite-tiling': path.resolve(__dirname, 'node_modules/pixi.js/node_modules/@pixi/sprite-tiling'),
          '@pixi/constants': path.resolve(__dirname, 'node_modules/pixi.js/node_modules/@pixi/constants'),
          '@pixi/app': path.resolve(__dirname, 'node_modules/pixi.js/node_modules/@pixi/app'),
          '@pixi/extensions': path.resolve(__dirname, 'node_modules/pixi.js/node_modules/@pixi/extensions'),
          '@pixi/accessibility': path.resolve(__dirname, 'node_modules/pixi.js/node_modules/@pixi/accessibility'),
        }
      },
      optimizeDeps: {
        include: ['pixi.js', '@pixi/react'],
      }
    };
});
