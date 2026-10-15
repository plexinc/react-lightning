import { resolve } from 'node:path';

const entry = process.env.SIZE_ENTRY;
const ext = (process.env.SIZE_EXTERNAL ?? 'react').split(',');

export default {
  logLevel: 'warn',
  publicDir: false,
  define: { 'process.env.NODE_ENV': '"production"' },
  build: {
    outDir: resolve(import.meta.dirname, 'out', `${entry}-${ext.join('+').replace(/\//g, '_')}`),
    emptyOutDir: true,
    target: 'es2017',
    minify: true,
    lib: { entry: resolve(import.meta.dirname, `${entry}.ts`), formats: ['es'], fileName: entry },
    rolldownOptions: { external: (id) => ext.some((e) => id === e || id.startsWith(`${e}/`)) },
  },
};
