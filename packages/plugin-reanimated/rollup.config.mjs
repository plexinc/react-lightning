import createRollupConfig from '@repo/rollup-config';

export default createRollupConfig({
  outputExports: 'named',
  external: [
    'react/jsx-runtime',
    'react',
    'react-native',
    'react-native-reanimated-original',
    '@plextv/react-lightning-plugin-css-transform',
  ],
});
