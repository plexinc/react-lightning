import { cp } from 'node:fs/promises';
import path from 'node:path';
import { genFont, setGeneratePaths } from '@lightningjs/msdf-generator';
import { adjustFont } from '@lightningjs/msdf-generator/adjustFont';
import { readFileChecksum, writeChecksumCache } from './checksum';
import { ensureConfigsExist } from './configs';
import getFiles from './getFiles';
import type { OptionsInput } from './types';

export default async function generateFonts(
  options: OptionsInput,
  force: boolean,
  checksums: Record<string, number | null>,
  cacheFolder: string,
  copyOriginalToDestDir: boolean,
): Promise<void> {
  const cleanup = await ensureConfigsExist(options);
  const { charsetFile, types } = options;

  try {
    const files = await getFiles(options, force, checksums);

    if (files.length === 0) {
      console.log('No font files found');
      return;
    }

    for (const {
      inputDir,
      outputDir,
      charsetChecksum,
      files: fontFiles,
    } of files) {
      checksums[charsetFile] = charsetChecksum;

      setGeneratePaths(inputDir, outputDir, charsetFile);

      for (const { input, outputs } of fontFiles) {
        const inputFileName = path.basename(input.path);

        if (copyOriginalToDestDir) {
          const outputFile = path.join(outputDir, inputFileName);

          console.log(`Copying ${inputFileName} to ${outputFile}`);
          await cp(input.path, outputFile, { recursive: true });
        }

        for (const type of new Set(types)) {
          const font = await genFont(inputFileName, type);

          if (font) {
            await adjustFont(font);
          }
        }

        checksums[input.path] = await readFileChecksum(input.path);

        for (const output of outputs) {
          const newOutputChecksum = await readFileChecksum(output.path);

          checksums[output.path] = newOutputChecksum;
        }
      }
    }

    await writeChecksumCache(checksums, cacheFolder);
  } catch (err) {
    console.error('Error generating font:', err);
  }

  await cleanup();
}
