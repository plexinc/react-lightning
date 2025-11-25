import { existsSync } from 'node:fs';
import { unlink, writeFile } from 'node:fs/promises';
import type { OptionsInput } from './types';

export async function ensureConfigsExist({
  charset,
  charsetFile,
  overrides,
  overridesFile,
}: OptionsInput): Promise<() => Promise<unknown[]>> {
  const cleanupFiles: string[] = [];

  console.info(`Looking for charset file at ${charsetFile}`);

  if (!existsSync(charsetFile)) {
    if (charset) {
      console.info(
        `  Charset not found. Creating charset file (${charsetFile}) with charset: ${charset}`,
      );
      await writeFile(charsetFile, JSON.stringify({ charset }), 'utf8');
      cleanupFiles.push(charsetFile);
    } else {
      console.info('  Charset not found. Using default charset.');
    }
  }

  console.info(`Looking for overrides file at ${overridesFile}`);

  if (!existsSync(overridesFile)) {
    if (overrides) {
      console.info(
        `  Overrides file not found. Creating overrides file (${overridesFile}) with overrides: ${overrides}`,
      );
      await writeFile(overridesFile, JSON.stringify(overrides, null, 2));
      cleanupFiles.push(overridesFile);
    } else {
      console.info(
        '  Overrides file not found and no overrides provided. Skipping.',
      );
    }
  }

  return () => {
    console.log('Cleaning up...');
    return Promise.all(
      cleanupFiles.map((file) => {
        console.info(`  Removing ${file}`);
        return unlink(file);
      }),
    );
  };
}
