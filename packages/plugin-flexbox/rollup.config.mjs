import createRollupConfig from '@repo/rollup-config';

export default createRollupConfig({
  useClient: true,
  external: ['yoga-layout/load'],
});
