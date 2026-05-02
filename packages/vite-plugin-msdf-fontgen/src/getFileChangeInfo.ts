import { existsSync } from 'node:fs';

import { readFileChecksum } from './checksum';

export async function getFileChangeInfo(
  filePath: string,
  checksums: Record<string, number | null>,
): Promise<{
  needsUpdate: boolean;
  checksum: number | null;
}> {
  try {
    const fileExists = existsSync(filePath);
    const checksum = await readFileChecksum(filePath);

    return {
      needsUpdate: !fileExists || checksums[filePath] !== checksum,
      checksum,
    };
  } catch (err) {
    console.error('Error reading file:', err);

    return { needsUpdate: true, checksum: null };
  }
}
