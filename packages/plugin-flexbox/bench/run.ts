import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { fixtures } from './fixtures';
import { type Metrics, runFixture } from './harness';

// Structural metrics are counts (layout passes, remeasures, ...) — algorithmic,
// so they don't vary by machine. `ms` is wall time and does, so it's reported
// but never gated. The per-engineer dev loop is: `save` a local baseline on
// your branch point, then compare the delta after your change.
const GATED: (keyof Metrics)[] = [
  'nodeCount',
  'layoutPasses',
  'settles',
  'maxPassesToSettle',
  'reflows',
  'textRemeasures',
];
const REPORTED: (keyof Metrics)[] = [...GATED, 'ms'];

const here = dirname(fileURLToPath(import.meta.url));
const referencePath = join(here, 'baseline.json'); // committed, machine-independent counts
const localPath = join(here, '.baseline.local.json'); // gitignored, per-engineer snapshot

type Baseline = Record<string, Partial<Metrics>>;

const read = (p: string): Baseline => {
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as Baseline;
  } catch {
    return {};
  }
};

export async function collect(): Promise<Record<string, Metrics>> {
  const out: Record<string, Metrics> = {};
  for (const fixture of fixtures) {
    out[fixture.name] = await runFixture(fixture);
  }
  return out;
}

// Gated drift only (used by the CI reference gate).
export function diff(
  current: Record<string, Metrics>,
  baseline: Baseline,
): { name: string; metric: string; from: number; to: number }[] {
  const drift: { name: string; metric: string; from: number; to: number }[] = [];
  for (const [name, metrics] of Object.entries(current)) {
    const base = baseline[name];
    if (!base) {
      drift.push({ name, metric: '(new fixture)', from: NaN, to: NaN });
      continue;
    }
    for (const key of GATED) {
      if (base[key] !== metrics[key]) {
        drift.push({ name, metric: key, from: base[key] as number, to: metrics[key] });
      }
    }
  }
  return drift;
}

function writeBaseline(path: string, current: Record<string, Metrics>, keys: (keyof Metrics)[]): void {
  const out: Baseline = {};
  for (const [name, m] of Object.entries(current)) {
    out[name] = Object.fromEntries(keys.map((k) => [k, m[k]])) as Partial<Metrics>;
  }
  writeFileSync(path, `${JSON.stringify(out, null, 2)}\n`);
}

function fmtDelta(from: number | undefined, to: number): string {
  if (from == null || Number.isNaN(from)) return '';
  const d = to - from;
  if (d === 0) return '  (=)';
  return `  (${d > 0 ? '+' : ''}${Math.round(d * 10) / 10})`;
}

function report(current: Record<string, Metrics>, against?: Baseline): void {
  for (const [name, m] of Object.entries(current)) {
    const base = against?.[name];
    const cols = REPORTED.map((k) => `${k}=${m[k]}${base ? fmtDelta(base[k] as number, m[k] as number) : ''}`);
    console.log(`${name.padEnd(8)} ${cols.join('  ')}`);
  }
}

export async function main(): Promise<void> {
  const mode = process.argv[2];
  const current = await collect();

  if (mode === 'save') {
    writeBaseline(localPath, current, REPORTED);
    report(current);
    console.log(`\nlocal baseline saved to ${localPath}\nMake your change, then run \`bench\` to see the delta.`);
    return;
  }

  if (mode === '--update') {
    writeBaseline(referencePath, current, GATED);
    report(current);
    console.log('\ncommitted reference baseline updated.');
    return;
  }

  // Default: compare vs the local snapshot (the delta is the signal).
  if (existsSync(localPath)) {
    console.log('delta vs your local baseline:\n');
    report(current, read(localPath));
    return;
  }

  report(current);
  console.log('\nNo local baseline yet. Run `bench save` at your branch point, then `bench` after your change.');
}
