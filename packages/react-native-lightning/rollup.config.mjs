import createRollupConfig from '@repo/rollup-config';

export default createRollupConfig({
  useClient: true,
  external: [
    'react/jsx-runtime',
    'react',
    'react-native-web',
    '@plex/react-lightning',
    '@plex/react-lightning-plugin-css-transform',
    '@plex/react-lightning-plugin-flexbox',
  ],
});
