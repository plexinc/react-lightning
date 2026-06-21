/**
 * Text block measurement for the Yoga worker — a measurement-focused port of
 * `@lightningjs/renderer`'s `TextLayoutEngine` (Apache-2.0). It reproduces the
 * renderer's line-wrapping exactly so the size Yoga lays out matches the size
 * the renderer paints; only the parts that affect the measured box (line widths
 * and line count) are kept — glyph positions, baselines and x-offsets are not.
 *
 * Width maths run in atlas design units via `FontMetrics.measureText`; the
 * public entry point converts to/from px using `fontScale`.
 */

import type { FontMetrics, LightningMetrics } from './FontMetricsStore';

export interface TextMeasureProps {
  text: string;
  fontSize: number;
  letterSpacing: number;
  /** ≤3 → multiplier of the natural line height; otherwise px. Matches renderer. */
  lineHeight: number;
  maxLines: number;
  /** Hard cap in px (0 = none). */
  maxHeight: number;
  wordBreak: 'break-word' | 'break-all' | 'overflow';
  overflowSuffix: string;
}

export interface MeasuredText {
  /** px */
  width: number;
  /** px */
  height: number;
}

// [text, width(design units), truncated]
type Line = [string, number, boolean];

const spaceRegex = /[ ​]+/g;

const measure = (font: FontMetrics, text: string, letterSpacing: number): number =>
  font.measureText(text, letterSpacing);

const normalizeFontMetrics = (metrics: LightningMetrics, fontSize: number) => {
  const scale = fontSize / metrics.unitsPerEm;

  return {
    ascender: metrics.ascender * scale,
    descender: metrics.descender * scale,
  };
};

/**
 * Measure a text block within an available width.
 *
 * @param availableWidth px width to wrap within; `Infinity`/`<=0` means
 *   unconstrained (no wrapping, single line per `\n`).
 * @returns box size in px.
 */
export function layoutText(
  font: FontMetrics,
  props: TextMeasureProps,
  availableWidth: number,
): MeasuredText {
  const { text, fontSize, lineHeight, maxLines, maxHeight, wordBreak, overflowSuffix } = props;

  const fontScale = fontSize / font.designFontSize;
  // measureText + maxWidth live in design units; px → design via /fontScale.
  const letterSpacing = props.letterSpacing / fontScale;
  const maxWidth =
    availableWidth === Infinity || availableWidth <= 0 ? 0 : availableWidth / fontScale;

  // Line height in px, from em-scaled metrics (renderer parity).
  const { ascender, descender } = normalizeFontMetrics(font.metrics, fontSize);
  const bareLineHeight = ascender - descender;
  const lineHeightPx = lineHeight <= 3 ? lineHeight * bareLineHeight : lineHeight;

  let effectiveMaxLines = maxLines;

  if (maxHeight > 0 && lineHeightPx > 0) {
    const maxFromHeight = Math.max(1, Math.floor(maxHeight / lineHeightPx));

    if (effectiveMaxLines === 0 || maxFromHeight < effectiveMaxLines) {
      effectiveMaxLines = maxFromHeight;
    }
  }

  const lines =
    maxWidth > 0
      ? wrapText(font, text, maxWidth, letterSpacing, overflowSuffix, wordBreak, effectiveMaxLines)
      : measureLines(font, text.split('\n'), letterSpacing, effectiveMaxLines);

  let widthDesign = 0;

  for (const line of lines) {
    if (line[1] > widthDesign) {
      widthDesign = line[1];
    }
  }

  return {
    width: widthDesign * fontScale,
    height: lines.length * lineHeightPx,
  };
}

function measureLines(
  font: FontMetrics,
  rawLines: string[],
  letterSpacing: number,
  maxLines: number,
): Line[] {
  const limit = maxLines > 0 ? maxLines : rawLines.length;
  const out: Line[] = [];

  for (let i = 0; i < rawLines.length && out.length < limit; i++) {
    const raw = rawLines[i] ?? '';
    out.push([raw, measure(font, raw, letterSpacing), false]);
  }

  return out;
}

function wrapText(
  font: FontMetrics,
  text: string,
  maxWidth: number,
  letterSpacing: number,
  overflowSuffix: string,
  wordBreak: TextMeasureProps['wordBreak'],
  maxLines: number,
): Line[] {
  const sourceLines = text.split('\n');
  const wrappedLines: Line[] = [];
  const spaceWidth = measure(font, ' ', letterSpacing);
  const overflowWidth = measure(font, overflowSuffix, letterSpacing);
  const hasMaxLines = maxLines > 0;
  let remainingLines = hasMaxLines ? maxLines : 1000;

  for (let i = 0; i < sourceLines.length; i++) {
    const line = sourceLines[i] ?? '';

    const produced =
      line.length > 0
        ? wrapLine(
            font,
            line,
            maxWidth,
            letterSpacing,
            spaceWidth,
            overflowSuffix,
            overflowWidth,
            wordBreak,
            remainingLines,
          )
        : ([[['', 0, false]], remainingLines] as [Line[], number]);

    remainingLines = produced[1] - 1;
    wrappedLines.push(...produced[0]);

    if (hasMaxLines && remainingLines <= 0) {
      break;
    }
  }

  return wrappedLines;
}

function wrapLine(
  font: FontMetrics,
  line: string,
  maxWidth: number,
  letterSpacing: number,
  spaceWidth: number,
  overflowSuffix: string,
  overflowWidth: number,
  wordBreak: TextMeasureProps['wordBreak'],
  remainingLinesIn: number,
): [Line[], number] {
  const words = line.split(spaceRegex);
  const spaces = line.match(spaceRegex) || [];
  const wrappedLines: Line[] = [];
  let currentLine = '';
  let currentLineWidth = 0;
  let remainingLines = remainingLinesIn;

  while (words.length > 0 && remainingLines > 0) {
    let word = words.shift() ?? '';
    let wordWidth = measure(font, word, letterSpacing);

    if (currentLineWidth === 0) {
      if (wordWidth > maxWidth) {
        remainingLines--;

        let remainingWord = '';
        [word, remainingWord, wordWidth] =
          remainingLines === 0
            ? truncateWord(
                font,
                word,
                wordWidth,
                maxWidth,
                letterSpacing,
                overflowSuffix,
                overflowWidth,
              )
            : splitWord(font, word, wordWidth, maxWidth, letterSpacing);

        if (remainingWord.length > 0) {
          words.unshift(remainingWord);
        }

        wrappedLines.push([word, wordWidth, false]);
      } else if (wordWidth + spaceWidth >= maxWidth) {
        remainingLines--;
        wrappedLines.push([word, wordWidth, false]);
      } else {
        currentLine = word;
        currentLineWidth = wordWidth;
      }

      continue;
    }

    const space = spaces.shift() || '';
    const effectiveSpaceWidth = space === '​' ? 0 : spaceWidth;
    const totalWidth = currentLineWidth + effectiveSpaceWidth + wordWidth;

    if (totalWidth < maxWidth) {
      currentLine += effectiveSpaceWidth > 0 ? space + word : word;
      currentLineWidth = totalWidth;
      continue;
    }

    remainingLines--;

    if (totalWidth === maxWidth) {
      currentLine += effectiveSpaceWidth > 0 ? space + word : word;
      wrappedLines.push([currentLine, totalWidth, false]);
      currentLine = '';
      currentLineWidth = 0;
      continue;
    }

    let remainingWord = '';
    [currentLine, currentLineWidth, remainingWord] = breakOntoNextLine(
      font,
      word,
      wordWidth,
      letterSpacing,
      wrappedLines,
      currentLine,
      currentLineWidth,
      remainingLines,
      maxWidth,
      space,
      spaceWidth,
      overflowSuffix,
      overflowWidth,
      wordBreak,
    );

    if (remainingWord.length > 0) {
      words.unshift(remainingWord);
    }
  }

  if (currentLineWidth > 0 && remainingLines > 0) {
    wrappedLines.push([currentLine, currentLineWidth, false]);
  }

  return [wrappedLines, remainingLines];
}

function breakOntoNextLine(
  font: FontMetrics,
  word: string,
  wordWidth: number,
  letterSpacing: number,
  wrappedLines: Line[],
  currentLine: string,
  currentLineWidth: number,
  remainingLines: number,
  maxWidth: number,
  space: string,
  spaceWidth: number,
  overflowSuffix: string,
  overflowWidth: number,
  wordBreak: TextMeasureProps['wordBreak'],
): [string, number, string] {
  if (wordBreak === 'overflow') {
    currentLine += space + word;
    currentLineWidth += spaceWidth + wordWidth;
    wrappedLines.push([currentLine, currentLineWidth, true]);
    return ['', 0, ''];
  }

  if (wordBreak === 'break-all') {
    let remainingSpace = maxWidth - currentLineWidth;

    if (currentLineWidth > 0) {
      remainingSpace -= spaceWidth;
    }

    const truncate = remainingLines === 0;
    let remainingWord = '';
    [word, remainingWord, wordWidth] = truncate
      ? truncateWord(
          font,
          word,
          wordWidth,
          remainingSpace,
          letterSpacing,
          overflowSuffix,
          overflowWidth,
        )
      : splitWord(font, word, wordWidth, remainingSpace, letterSpacing);

    wrappedLines.push([
      currentLine + space + word,
      currentLineWidth + spaceWidth + wordWidth,
      truncate,
    ]);
    return ['', 0, remainingWord];
  }

  // break-word (default): push the current line, carry the whole word over.
  wrappedLines.push([currentLine, currentLineWidth, false]);
  return ['', 0, word];
}

function splitWord(
  font: FontMetrics,
  word: string,
  wordWidth: number,
  maxWidth: number,
  letterSpacing: number,
): [string, string, number] {
  if (maxWidth <= 0) {
    return ['', word, 0];
  }

  const shouldStartFromBack = wordWidth - maxWidth < wordWidth / 2;

  if (!shouldStartFromBack) {
    let currentWidth = wordWidth;

    for (let i = word.length - 1; i > 0; i--) {
      currentWidth -= measure(font, word.charAt(i), letterSpacing);

      if (currentWidth <= maxWidth) {
        return [word.substring(0, i), word.substring(i), currentWidth];
      }
    }

    return ['', word, 0];
  }

  let currentWidth = 0;

  for (let i = 0; i < word.length; i++) {
    const charWidth = measure(font, word.charAt(i), letterSpacing);

    if (currentWidth + charWidth > maxWidth) {
      return [word.substring(0, i), word.substring(i), currentWidth];
    }

    currentWidth += charWidth;
  }

  return [word, '', wordWidth];
}

function truncateWord(
  font: FontMetrics,
  word: string,
  wordWidth: number,
  maxWidth: number,
  letterSpacing: number,
  overflowSuffix: string,
  overflowWidth: number,
): [string, string, number] {
  const targetWidth = maxWidth - overflowWidth;

  if (targetWidth <= 0) {
    return ['', word, 0];
  }

  const shouldStartFromBack = wordWidth - targetWidth < wordWidth / 2;

  if (!shouldStartFromBack) {
    let currentWidth = wordWidth;

    for (let i = word.length - 1; i > 0; i--) {
      currentWidth -= measure(font, word.charAt(i), letterSpacing);

      if (currentWidth <= targetWidth) {
        return [
          word.substring(0, i) + overflowSuffix,
          word.substring(i),
          currentWidth + overflowWidth,
        ];
      }
    }

    return [overflowSuffix, word, overflowWidth];
  }

  let currentWidth = 0;

  for (let i = 0; i < word.length; i++) {
    const charWidth = measure(font, word.charAt(i), letterSpacing);

    if (currentWidth + charWidth > targetWidth) {
      return [
        word.substring(0, i) + overflowSuffix,
        word.substring(i),
        currentWidth + overflowWidth,
      ];
    }

    currentWidth += charWidth;
  }

  return [word + overflowSuffix, '', wordWidth + overflowWidth];
}
