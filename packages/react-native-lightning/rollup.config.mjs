import createRollupConfig from '@repo/rollup-config';

export default createRollupConfig({
  external: [
    'react/jsx-runtime',
    'react',
    'react-native-web',
    '@plextv/react-lightning',
    '@plextv/react-lightning-plugin-css-transform',
    '@plextv/react-lightning-plugin-flexbox',
  ],
});
