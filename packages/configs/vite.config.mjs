import { defineConfig } from 'vite';

const esmExt = 'js';
const cjsExt = 'cjs';
const createEntryCode = (fileName) => `'use strict';
if (process.env.NODE_ENV === 'production') {
  module.exports = require('./${fileName}.production.${cjsExt}');
} else {
  module.exports = require('./${fileName}.development.${cjsExt}');
}`;

/**
 * Generates an entry file that will load the production or development build
 * depending on the user's NODE_ENV.
 * @type {Plugin}
 */
const generateEntryFile = {
  name: 'generate-entry-file',
  async generateBundle(options, bundle) {
    if (options.format !== 'cjs') {
      return;
    }

    let name = 'index';

    for (const info of Object.values(bundle)) {
      if (info.isEntry) {
        name = info.name;
      }
    }

    this.emitFile({
      type: 'asset',
      fileName: `cjs/${name}.${cjsExt}`,
      source: createEntryCode(name),
    });
  },
};

export default defineConfig(({ mode }) => ({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'index',
      fileName: (format, entryName) =>
        `${format}/${entryName}.${mode}.${format === 'es' ? esmExt : cjsExt}`,
      formats: ['es', 'cjs'],
    },
    minify: mode === 'production',
    sourcemap: true,
    emptyOutDir: false,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  plugins: [generateEntryFile],
}));
