import path from 'node:path';
import { glob } from 'glob';
import { getFileChangeInfo } from './getFileChangeInfo';
import { sortByExtension } from './sortByExtension';
import type { OptionsInput } from './types';

type FontFileInfo = {
  path: string;
  checksum: number | null;
};

type FontInfo = {
  inputDir: string;
  outputDir: string;
  fontNames: Set<string>;
  charsetChecksum: number | null;
  files: {
    input: FontFileInfo;
    outputs: FontFileInfo[];
  }[];
};

export default async function getFiles(
  { src, dest, charsetFile, types, extensions }: OptionsInput,
  force: boolean,
  checksums: Record<string, number | null>,
): Promise<FontInfo[]> {
  const fontFiles: Record<string, FontInfo> = {};
  const extensionGlob =
    extensions.length > 1 ? `{${extensions.join(',')}}` : extensions[0];

  console.log('Looking for fonts...');
  const inputFonts = await glob(`${src}/**/*.${extensionGlob}`);
  const charsetFileChangeInfo = await getFileChangeInfo(charsetFile, checksums);
  const shouldForce = force || charsetFileChangeInfo.needsUpdate;

  console.info(
    `Found ${inputFonts.length} files:\n  ${inputFonts.join('\n  ')}`,
  );

  // Sort files by extension so it follows the order of the extensions option
  for (const inputFontFile of inputFonts.sort(sortByExtension(extensions))) {
    const inputFileChangeInfo = await getFileChangeInfo(
      inputFontFile,
      checksums,
    );

    const inputDir = path.dirname(inputFontFile);
    const outputDir = path.join(dest, path.relative(src, inputDir));
    const fontFilename = path.basename(inputFontFile);
    const fontName = path.basename(fontFilename, path.extname(inputFontFile));
    let fontInfo = fontFiles[inputDir];

    if (!fontInfo) {
      fontInfo = fontFiles[inputDir] = {
        inputDir,
        outputDir,
        fontNames: new Set(),
        charsetChecksum: charsetFileChangeInfo.checksum,
        files: [],
      };
    }

    // Don't add the same font twice
    if (fontInfo.fontNames.has(fontName)) {
      continue;
    }

    const outputs: FontFileInfo[] = [];

    for (const type of types) {
      const { name } = path.parse(fontFilename);
      const outputFile = path.join(outputDir, `${name}.${type}.png`);
      const outputFileChangeInfo = await getFileChangeInfo(
        outputFile,
        checksums,
      );

      if (shouldForce || outputFileChangeInfo.needsUpdate) {
        outputs.push({
          path: outputFile,
          checksum: outputFileChangeInfo.checksum,
        });
      }
    }

    if (outputs.length) {
      fontInfo.files.push({
        input: {
          path: inputFontFile,
          checksum: inputFileChangeInfo.checksum,
        },
        outputs,
      });
    }

    fontInfo.fontNames.add(fontName);
  }

  return Object.values(fontFiles);
}
