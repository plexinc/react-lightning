import createRollupConfig from '@repo/rollup-config';

export default createRollupConfig({
  useClient: true,
  outputExports: 'named',
  external: [
    'react/jsx-runtime',
    'react',
    'react-native',
    'react-native-reanimated-original',
    '@plex/react-lightning-plugin-css-transform',
  ],
});
