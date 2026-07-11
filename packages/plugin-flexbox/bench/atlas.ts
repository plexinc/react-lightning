import type { AtlasData } from '../src/text/FontMetricsStore';

// Deterministic synthetic atlas: every ASCII glyph is a fixed width so text
// measurement is reproducible without shipping a real font. Metrics mirror the
// integration test's atlas (fontSize 20 -> 10px/glyph, line height 20px).
const BENCH_FONT_FAMILY = 'Bench';

function buildChars(): AtlasData['chars'] {
  const chars: AtlasData['chars'] = [];
  // Printable ASCII 32..126, uniform advance, plus '?' fallback at 63.
  for (let id = 32; id <= 126; id++) {
    chars.push({ id, xadvance: 10, xoffset: 0, yoffset: 0, width: 8, height: 8 });
  }
  return chars;
}

export const benchAtlas: AtlasData = {
  info: { size: 10, face: BENCH_FONT_FAMILY },
  common: { lineHeight: 12, base: 8 },
  lightningMetrics: { ascender: 800, descender: -200, lineGap: 0, unitsPerEm: 1000 },
  chars: buildChars(),
  kernings: [],
};

export const BENCH_FONT = BENCH_FONT_FAMILY;

// data: URL so LightningManager.init's real font-load path works offline.
export const benchAtlasUrl = `data:application/json;base64,${Buffer.from(
  JSON.stringify(benchAtlas),
).toString('base64')}`;
