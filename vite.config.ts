import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Kenzo',
      formats: ['es', 'umd'],
      fileName: (format) => (format === 'es' ? 'kenzo-sdk.js' : 'kenzo-sdk.umd.cjs'),
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: false,
        exports: 'named',
      },
    },
    sourcemap: true,
    minify: 'esbuild',
    target: 'es2020',
    cssCodeSplit: false,
  },
  define: {
    __SDK_VERSION__: JSON.stringify(process.env.npm_package_version ?? '1.0.0'),
  },
});
