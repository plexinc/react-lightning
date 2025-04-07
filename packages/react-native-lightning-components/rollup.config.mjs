import { dirname } from 'node:path';
import createRollupConfig from '@repo/rollup-config';
import { globSync } from 'glob';

const exportFiles = globSync('./src/exports/*/*.{tsx,ts}');

const configs = exportFiles.map((file) => {
  const outputDir = dirname(file.replace('src/exports', ''));

  return createRollupConfig({
    input: file,
    outputDir: (format) => `./dist/${format}${outputDir}`,
    external: [
      '@plexinc/react-lightning',
      '@plexinc/react-native-lightning',
      '@shopify/flash-list',
      'react',
      'react-native',
      'react-native-web',
      'react/jsx-runtime',
    ],
  });
});

export default configs.flat();
