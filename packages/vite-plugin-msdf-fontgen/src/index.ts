import fs from 'node:fs';
import path from 'node:path';
import { genFont, setGeneratePaths } from '@lightningjs/msdf-generator';
import { adjustFont } from '@lightningjs/msdf-generator/adjustFont';
import type { PluginOption } from 'vite';

interface OverrideOption {
  fontSize?: number;
  distanceRange?: number;
}

interface Override {
  [fontName: string]: {
    msdf?: OverrideOption;
    ssdf?: OverrideOption;
  };
}

interface Options {
  /**
   * Path to the input directory containing the font files
   */
  inputDir: string;
  /**
   * Path to the output directory
   */
  outDir: string;
  /**
   * Type of font to generate. Defaults to ['msdf']
   */
  types?: ('msdf' | 'ssdf')[];
  /**
   * Font extensions to include. Defaults to .ttf, .otf, .woff, and .woff2
   */
  extensions?: string[];
  /**
   * Force regeneration of fonts even if they already exist
   */
  force?: boolean;
  /**
   * Charset to include in the generated font. If there is a charset.txt file in
   * the input directory, that will be used instead. Defaults to
   * ' !\\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~’“”'
   */
  charset?: string;

  /**
   * Overrides for font generation. This allows you to specify custom font sizes
   * and distance ranges for specific fonts. The key is the font name. If an
   * override.txt file is present in the input directory, that will be used instead.
   */
  overrides?: Override;
}

export default function msdfFontGen({
  inputDir,
  outDir,
  force,
  types = ['msdf'],
  extensions = ['.ttf', '.otf', '.woff', '.woff2'],
  charset = ' !\\"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~’“”',
  overrides,
}: Options): PluginOption {
  return {
    name: 'msdf-fontgen',

    async buildStart() {
      console.log('Building fonts...');

      const cleanup: string[] = [];

      if (types.length === 0) {
        console.log('No font types specified');
        return;
      }

      setGeneratePaths(inputDir, outDir);

      const files = fs.readdirSync(inputDir);
      const fontFiles = files.filter((file) =>
        extensions.some((ext) => file.endsWith(ext)),
      );

      if (fontFiles.length === 0) {
        console.log('No font files found');
        return;
      }

      const charsetPath = `${inputDir}/charset.txt`;
      if (!fs.existsSync(charsetPath) && charset) {
        fs.writeFileSync(charsetPath, charset);
        cleanup.push(charsetPath);
      }

      const overridePath = `${inputDir}/overrides.txt`;
      if (!fs.existsSync(overridePath) && overrides) {
        fs.writeFileSync(overridePath, JSON.stringify(overrides, null, 2));
        cleanup.push(overridePath);
      }

      await Promise.all(
        fontFiles.map(async (file) => {
          for (const type of new Set(types)) {
            await generateFont(outDir, file, type, force);
          }
        }),
      );

      for (const file of cleanup) {
        fs.unlinkSync(file);
      }
    },
  };
}

async function generateFont(
  outDir: string,
  file: string,
  type: 'msdf' | 'ssdf',
  force?: boolean,
) {
  const ext = file.split('.').pop();

  if (!ext) {
    throw new Error(`Invalid file: ${file}`);
  }

  const outputFile = path.join(outDir, file.replace(ext, `${type}.png`));

  if (!force && fs.existsSync(outputFile)) {
    console.log(`[Font Generation] File exists. Skipping ${file} (${type})`);
    return;
  }

  const font = await genFont(file, type);

  if (font) {
    await adjustFont(font);
  }
}
