import path from 'node:path';
import createRollupConfig from '@repo/rollup-config';

export default createRollupConfig({
  input: 'src/exports/index.ts',
  preserveModules: true,
  preserveModulesRoot: path.join('src', 'exports'),
  external: ['@plextv/react-lightning', 'react', 'react/jsx-runtime'],
});
