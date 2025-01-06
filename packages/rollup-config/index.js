import commonjs from '@rollup/plugin-commonjs';
import image from '@rollup/plugin-image';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import banner from 'rollup-plugin-banner2';
import swc from 'rollup-plugin-swc3';

export default ({
  useClient = false,
  preserveModules = false,
  outputExports = 'named',
  input = ['./src/index.ts'],
  external = [],
  options = {},
  plugins = [],
} = {}) => {
  return {
    ...options,
    input,
    output: [
      {
        dir: './dist/esm',
        entryFileNames: '[name].mjs',
        preserveModules,
        preserveModulesRoot: './src',
        assetFileNames({ name }) {
          return name?.replace(/^src\//, '') ?? '';
        },
        format: 'esm',
        exports: outputExports,
      },
      {
        dir: './dist/cjs',
        assetFileNames({ name }) {
          return name?.replace(/^src\//, '') ?? '';
        },
        format: 'cjs',
        exports: outputExports,
      },
    ],
    external,
    plugins: [
      ...plugins,
      commonjs(),
      nodeResolve({ browser: true }),
      replace({
        values: {
          'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
          __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
        },
        preventAssignment: true,
      }),
      image(),
      json(),
      swc({
        include: /\.[mc]?[jt]sx?$/, // default
      }),
      useClient
        ? banner(
            () => `'use client';
`,
          )
        : undefined,
    ],
  };
};
