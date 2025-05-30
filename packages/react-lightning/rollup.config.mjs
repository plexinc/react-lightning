import createRollupConfig from '@repo/rollup-config';

export default createRollupConfig({
  external: [
    '@lightningjs/renderer',
    '@lightningjs/renderer/webgl',
    '@lightningjs/renderer/canvas',
    '@lightningjs/threadx',
    'react',
    'react-reconciler',
    'react/jsx-runtime',
    'tseep',
  ],
});
