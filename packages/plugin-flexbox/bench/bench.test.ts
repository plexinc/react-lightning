import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { collect, diff } from './run';

// The gate: layout metrics for the fake pages must match the committed
// baseline. A layout change that moves them fails here on purpose. If the move
// is intended (e.g. fewer passes after an optimization), rebaseline with
// `tsx bench/run.ts --update` and commit the new baseline in the same change.
describe('layout benchmark', () => {
  it('matches the committed baseline (no unexplained drift)', async () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const baseline = JSON.parse(
      readFileSync(join(here, 'baseline.json'), 'utf8'),
    );

    const current = await collect();
    const drift = diff(current, baseline);

    expect(drift).toEqual([]);
  });
});
