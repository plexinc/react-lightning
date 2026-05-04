import path from 'node:path';

import type { PluginOption } from 'vite';

import { readChecksumCache } from './checksum';
import generateFonts from './generateFonts';
import type { OptionsArg, OptionsInput, OptionsInputArg } from './types';

export default function msdfFontGen({
  inputs,
  force = false,
  cacheFolder = '.font-cache',
  copyOriginalToDestDir = false,
}: OptionsArg): PluginOption {
  return {
    name: 'msdf-fontgen',

    async buildStart() {
      console.log('Building fonts...');

      const checksums = await readChecksumCache(cacheFolder);

      for (const input of inputs) {
        const options = getOptions(input);

        await generateFonts(options, force, checksums, cacheFolder, copyOriginalToDestDir);
      }
    },
  };
}

function getOptions(args: OptionsInputArg): OptionsInput {
  return {
    types: ['msdf'],
    extensions: ['ttf', 'otf', 'woff', 'woff2'],
    charset:
      ' !\\"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~’“”',
    charsetFile: path.join(args.src, 'charset.config.json'),
    overridesFile: path.join(args.src, 'overrides.json'),
    ...args,
  };
}
