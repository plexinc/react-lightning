import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { loadYoga } from './loadYoga';

// Chrome 57 shipped WebAssembly MVP and nothing else: sign-ext and mutable
// globals came in 74, BigInt<->i64 in 85, bulk memory and the rest later.
// The scanner names every opcode, type and section form outside MVP.

const MVP_VALTYPES = new Set([0x7f, 0x7e, 0x7d, 0x7c]);

const OPCODE_FEATURES: Record<number, string> = {
  0x06: 'exceptions',
  0x07: 'exceptions',
  0x08: 'exceptions',
  0x09: 'exceptions',
  0x0a: 'exceptions',
  0x12: 'tail-call',
  0x13: 'tail-call',
  0x14: 'function-references',
  0x15: 'function-references',
  0x18: 'exceptions',
  0x19: 'exceptions',
  0x1c: 'reference-types',
  0x1f: 'exceptions',
  0x25: 'reference-types',
  0x26: 'reference-types',
  0xc0: 'sign-ext',
  0xc1: 'sign-ext',
  0xc2: 'sign-ext',
  0xc3: 'sign-ext',
  0xc4: 'sign-ext',
  0xd0: 'reference-types',
  0xd1: 'reference-types',
  0xd2: 'reference-types',
  0xfb: 'gc',
  0xfd: 'simd',
  0xfe: 'threads',
};

function scanWasmFeatures(bytes: Uint8Array): Record<string, number> {
  const features: Record<string, number> = {};
  const hit = (feature: string) => {
    features[feature] = (features[feature] ?? 0) + 1;
  };
  let p = 8;
  const byte = () => bytes[p++] ?? 0;
  const uleb = () => {
    let result = 0;
    let shift = 0;
    let b: number;

    do {
      b = byte();
      result += (b & 0x7f) * 2 ** shift;
      shift += 7;
    } while (b & 0x80);

    return result;
  };
  const skipLeb = () => {
    while (byte() & 0x80);
  };
  const skip = (length: number) => {
    p += length;
  };
  const valtype = () => {
    const t = byte();

    if (!MVP_VALTYPES.has(t)) {
      hit(t === 0x7b ? 'simd' : 'reference-types');
    }

    return t;
  };
  const limits = () => {
    const flags = byte();

    if (flags & 0x02) hit('threads (shared memory)');
    if (flags & 0x04) hit('memory64');
    if (flags > 0x07) hit('unknown limits flag');

    uleb();
    if (flags & 0x01) uleb();
  };
  const constExpr = () => {
    const op = byte();

    if (op === 0x41 || op === 0x42 || op === 0x23) skipLeb();
    else if (op === 0x43) p += 4;
    else if (op === 0x44) p += 8;
    else hit('non-MVP constant expression');

    if (byte() !== 0x0b) hit('extended-const');
  };

  const types: { params: number[]; results: number[] }[] = [];
  const usesI64 = (type?: { params: number[]; results: number[] }) =>
    !!type && [...type.params, ...type.results].includes(0x7e);
  const funcTypes: number[] = [];
  const globalMutable: boolean[] = [];
  let tables = 0;
  let memories = 0;

  expect([...bytes.subarray(0, 8)]).toEqual([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);

  while (p < bytes.length) {
    const id = byte();
    const size = uleb();
    const end = p + size;

    switch (id) {
      case 0:
        break;
      case 1: {
        const count = uleb();

        for (let i = 0; i < count; i++) {
          if (byte() !== 0x60) hit('gc (non-func type)');

          const params = Array.from({ length: uleb() }, valtype);
          const results = Array.from({ length: uleb() }, valtype);

          if (results.length > 1) hit('multi-value');

          types.push({ params, results });
        }
        break;
      }
      case 2: {
        const count = uleb();

        for (let i = 0; i < count; i++) {
          skip(uleb());
          skip(uleb());
          const kind = byte();

          if (kind === 0) {
            const typeIndex = uleb();

            if (usesI64(types[typeIndex])) hit('bigint-integration (i64 in imported signature)');

            funcTypes.push(typeIndex);
          } else if (kind === 1) {
            if (byte() !== 0x70) hit('reference-types (externref table)');
            limits();
            tables++;
          } else if (kind === 2) {
            limits();
            memories++;
          } else if (kind === 3) {
            valtype();
            const mutable = byte() === 1;

            if (mutable) hit('mutable-globals (import)');

            globalMutable.push(mutable);
          } else {
            hit('exceptions (tag import)');
          }
        }
        break;
      }
      case 3: {
        const count = uleb();

        for (let i = 0; i < count; i++) funcTypes.push(uleb());
        break;
      }
      case 4: {
        const count = uleb();

        for (let i = 0; i < count; i++) {
          if (byte() !== 0x70) hit('reference-types (externref table)');
          limits();
          tables++;
        }
        break;
      }
      case 5: {
        const count = uleb();

        for (let i = 0; i < count; i++) {
          limits();
          memories++;
        }
        break;
      }
      case 6: {
        const count = uleb();

        for (let i = 0; i < count; i++) {
          valtype();
          globalMutable.push(byte() === 1);
          constExpr();
        }
        break;
      }
      case 7: {
        const count = uleb();

        for (let i = 0; i < count; i++) {
          skip(uleb());
          const kind = byte();
          const index = uleb();

          if (kind === 0) {
            if (usesI64(types[funcTypes[index] ?? -1])) {
              hit('bigint-integration (i64 in exported signature)');
            }
          } else if (kind === 3 && globalMutable[index]) {
            hit('mutable-globals (export)');
          } else if (kind > 3) {
            hit('exceptions (tag export)');
          }
        }
        break;
      }
      case 8:
        uleb();
        break;
      case 9: {
        const count = uleb();

        for (let i = 0; i < count; i++) {
          if (uleb() !== 0) {
            hit('bulk-memory / reference-types (element segment form)');
            break;
          }

          constExpr();
          const n = uleb();

          for (let j = 0; j < n; j++) uleb();
        }
        break;
      }
      case 10: {
        const count = uleb();

        for (let f = 0; f < count; f++) {
          const bodySize = uleb();
          const bodyEnd = p + bodySize;
          const localGroups = uleb();

          for (let i = 0; i < localGroups; i++) {
            uleb();
            valtype();
          }

          body: while (p < bodyEnd) {
            const op = byte();
            const feature = OPCODE_FEATURES[op];

            if (feature) {
              hit(feature);
              // Immediates of non-MVP opcodes aren't decoded, so stop here.
              break body;
            }

            if (op === 0x02 || op === 0x03 || op === 0x04) {
              const blockType = byte();

              if (blockType !== 0x40 && !MVP_VALTYPES.has(blockType)) {
                hit(blockType === 0x7b ? 'simd' : 'multi-value (typed block)');
                break body;
              }
            } else if (op === 0x0c || op === 0x0d || op === 0x10 || (op >= 0x20 && op <= 0x24)) {
              uleb();
            } else if (op === 0x0e) {
              const n = uleb();

              for (let i = 0; i <= n; i++) uleb();
            } else if (op === 0x11) {
              uleb();
              if (byte() !== 0) hit('reference-types (call_indirect on table > 0)');
            } else if (op >= 0x28 && op <= 0x3e) {
              uleb();
              uleb();
            } else if (op === 0x3f || op === 0x40) {
              if (byte() !== 0) hit('multi-memory');
            } else if (op === 0x41 || op === 0x42) {
              skipLeb();
            } else if (op === 0x43) {
              p += 4;
            } else if (op === 0x44) {
              p += 8;
            } else if (op === 0xfc) {
              hit(uleb() <= 7 ? 'nontrapping-fptoint' : 'bulk-memory');
              break body;
            } else if (
              !(op <= 0x01 || op === 0x05 || op === 0x0b || op === 0x0f || op === 0x1a) &&
              !(op === 0x1b || (op >= 0x45 && op <= 0xbf))
            ) {
              hit(`unknown opcode 0x${op.toString(16)}`);
              break body;
            }
          }

          p = bodyEnd;
        }
        break;
      }
      case 11: {
        const count = uleb();

        for (let i = 0; i < count; i++) {
          if (uleb() !== 0) {
            hit('bulk-memory (passive or indexed data segment)');
            break;
          }

          constExpr();
          skip(uleb());
        }
        break;
      }
      case 12:
        hit('bulk-memory (datacount section)');
        break;
      case 13:
        hit('exceptions (tag section)');
        break;
      default:
        hit(`unknown section ${id}`);
    }

    p = end;
  }

  if (tables > 1) hit('reference-types (multiple tables)');
  if (memories > 1) hit('multi-memory');

  return features;
}

const WASM_DATA_URI = /data:application\/octet-stream;base64,([A-Za-z0-9+/=]+)/;

const here = path.dirname(fileURLToPath(import.meta.url));
const vendorDir = path.join(here, 'vendor');
const yogaDist = path.resolve(createRequire(import.meta.url).resolve('yoga-layout/load'), '../..');

const read = (file: string) => readFileSync(file, 'utf8');
const embeddedWasm = (source: string) =>
  new Uint8Array(Buffer.from(source.match(WASM_DATA_URI)?.[1] ?? '', 'base64'));
const stripSourceMap = (source: string) => source.replace(/\n\/\/# sourceMappingURL=.*$/m, '\n');

const vendoredGlue = read(path.join(vendorDir, 'yoga-wasm-mvp.js'));
const upstreamGlue = stripSourceMap(read(path.join(yogaDist, 'binaries/yoga-wasm-base64-esm.js')));

describe('vendored yoga wasm', () => {
  it('uses nothing beyond WebAssembly MVP (Chrome 57)', () => {
    expect(scanWasmFeatures(embeddedWasm(vendoredGlue))).toEqual({});
  });

  it('catches the sign-ext opcodes in the upstream build', () => {
    expect(scanWasmFeatures(embeddedWasm(upstreamGlue))).toEqual({ 'sign-ext': 2 });
  });

  it('catches post-MVP features outside function bodies', () => {
    const header = [0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00];
    // A mutable i32 global, exported.
    const mutableGlobalExport = new Uint8Array(
      header.concat([
        0x06, 0x06, 0x01, 0x7f, 0x01, 0x41, 0x00, 0x0b, 0x07, 0x05, 0x01, 0x01, 0x67, 0x03, 0x00,
      ]),
    );
    // An exported (i64) => void function.
    const i64Export = new Uint8Array(
      header.concat(
        [0x01, 0x05, 0x01, 0x60, 0x01, 0x7e, 0x00, 0x03, 0x02, 0x01, 0x00],
        [0x07, 0x05, 0x01, 0x01, 0x66, 0x00, 0x00, 0x0a, 0x04, 0x01, 0x02, 0x00, 0x0b],
      ),
    );

    expect(WebAssembly.validate(mutableGlobalExport)).toBe(true);
    expect(WebAssembly.validate(i64Export)).toBe(true);
    expect(scanWasmFeatures(mutableGlobalExport)).toEqual({ 'mutable-globals (export)': 1 });
    expect(scanWasmFeatures(i64Export)).toEqual({
      'bigint-integration (i64 in exported signature)': 1,
    });
  });

  it('matches the installed yoga-layout (rerun `pnpm vendor:yoga` after a bump)', () => {
    const sha = createHash('sha256').update(embeddedWasm(upstreamGlue)).digest('hex');
    const withoutWasm = (source: string) => source.replace(WASM_DATA_URI, '<wasm>');

    expect(vendoredGlue).toContain(`// source-wasm-sha256: ${sha}\n`);
    expect(
      withoutWasm(vendoredGlue).endsWith(
        withoutWasm(upstreamGlue).replace(
          'var _scriptDir = import.meta.url;',
          'var _scriptDir = "";',
        ),
      ),
    ).toBe(true);
    expect(read(path.join(vendorDir, 'wrapAssembly.js'))).toBe(
      stripSourceMap(read(path.join(yogaDist, 'src/wrapAssembly.js'))).replaceAll(
        './generated/YGEnums.js',
        './YGEnums.js',
      ),
    );
    expect(read(path.join(vendorDir, 'YGEnums.js'))).toBe(
      stripSourceMap(read(path.join(yogaDist, 'src/generated/YGEnums.js'))),
    );
  });

  it('lays out a tree', async () => {
    const yoga = await loadYoga();
    const root = yoga.Node.create();
    const child = yoga.Node.create();

    root.setFlexDirection(yoga.FLEX_DIRECTION_ROW);
    root.setWidth(300);
    root.setHeight(100);
    root.setPadding(yoga.EDGE_ALL, 10);
    child.setFlexGrow(1);
    child.setMargin(yoga.EDGE_LEFT, 5);
    root.insertChild(child, 0);
    root.calculateLayout(undefined, undefined, yoga.DIRECTION_LTR);

    expect(child.getComputedLayout()).toMatchObject({
      left: 15,
      top: 10,
      width: 275,
      height: 80,
    });

    root.freeRecursive();
  });
});
