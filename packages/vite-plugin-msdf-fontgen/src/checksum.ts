import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crc32 from 'crc-32';

const CHECKSUM_FILENAME = 'hash.json';

export async function readFileChecksum(filePath: string) {
  try {
    const fileData = await readFile(filePath);

    return crc32.buf(fileData, 0);
  } catch (_err) {
    return null;
  }
}

export async function readChecksumCache(
  checksumFolder: string,
): Promise<Record<string, number>> {
  try {
    console.info('Loading checksums from cache...');

    const checksumsData = await readFile(
      path.join(checksumFolder, CHECKSUM_FILENAME),
      'utf8',
    );

    return JSON.parse(checksumsData.toString());
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
      console.error('Checksums file not found.');
    } else {
      console.error('Error reading checksums file:', err);
    }

    return {};
  }
}

export async function writeChecksumCache(
  checksums: Record<string, number | null>,
  checksumFolder: string,
) {
  try {
    if (!existsSync(checksumFolder)) {
      console.info(
        `Cache folder doesn't exist. Creating one at ${checksumFolder}`,
      );
      await mkdir(checksumFolder, { recursive: true });
    }

    console.info('Writing checksums to cache...');
    await writeFile(
      path.join(checksumFolder, CHECKSUM_FILENAME),
      JSON.stringify(checksums, null, 2),
      {
        encoding: 'utf8',
        flag: 'w+',
      },
    );
  } catch (err) {
    console.error('Error writing checksums file:', err);
  }
}
