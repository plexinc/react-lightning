import createRollupConfig from '@repo/rollup-config';

export default createRollupConfig({
  useClient: true,
  external: ['@plex/react-lightning', 'react', 'react/jsx-runtime'],
});
