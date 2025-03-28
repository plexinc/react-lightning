import createRollupConfig from '@repo/rollup-config';

export default createRollupConfig({
  useClient: true,
  createDevBuilds: true,
  external: [
    'react/jsx-runtime',
    'react',
    'react-native-web',
    '@plexinc/react-lightning',
    '@plexinc/react-lightning-plugin-css-transform',
    '@plexinc/react-lightning-plugin-flexbox',
  ],
});
