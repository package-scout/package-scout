import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import wasm from 'vite-plugin-wasm'

export default defineConfig({
  plugins: [
    wasm(),
    nodePolyfills({
      // Whether to polyfill specific globals.
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Whether to polyfill Node.js built-in modules.
      modules: {
        fs: true,
        path: true,
        util: true,
        stream: true,
        crypto: true,
        os: true,
        child_process: false, // Cannot be polyfilled in browser
      },
    }),
  ],
  build: {
    target: 'esnext',
    lib: {
      entry: 'src/index.ts',
      name: 'PackageBuildStatsBrowser',
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
      },
    },
  },
  worker: {
    format: 'es',
    plugins: () => [wasm()],
  },
  optimizeDeps: {
    exclude: ['@rollup/browser'],
  },
  server: {
    fs: {
      allow: ['..'],
    },
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
})
