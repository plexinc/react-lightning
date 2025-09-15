import { describe, expect, it, suite } from 'vitest';
import { Direction } from '../focus/Direction';
import type { LightningElement, Rect } from '../types';
import { findClosestElement, getOverlap } from './findClosestElement';

// First element is the source, second is the direction, third is the
// expected closest element or null if there is no closest element.
type TestCases = [number, Direction, number | null][];

function createMockElement(id: number, dimensions: Rect): LightningElement {
  return {
    id,
    children: [],
    node: { ...dimensions },
    focusable: true,
    insertChild(this: LightningElement, child: LightningElement) {
      this.children.push(child);
    },
    getRelativePosition(
      this: LightningElement,
      relativeElement?: LightningElement,
    ) {
      const relativeX = relativeElement?.node?.x ?? 0;
      const relativeY = relativeElement?.node?.y ?? 0;

      return {
        x: relativeX + this.node.x,
        y: relativeY + this.node.y,
      };
    },
  } as unknown as LightningElement;
}

function createLayout(
  w: number,
  h: number,
  dimensions: Rect[],
): { root: LightningElement; [id: number]: LightningElement } {
  const result: { root: LightningElement; [id: number]: LightningElement } = {
    root: createMockElement(0, {
      x: 0,
      y: 0,
      w,
      h,
    }),
  };

  dimensions.forEach((rect, index) => {
    const id = index + 1;
    const el = createMockElement(id, rect);

    result[id] = el;
    result.root.insertChild(el);
  });

  return result;
}

function runTestsOnElements(
  elements: { [id: number]: LightningElement; root: LightningElement },
  tests: TestCases,
) {
  const childElements = elements.root.children;

  for (const [source, direction, expected] of tests) {
    const sourceElement = elements[source];

    if (!sourceElement) {
      throw new Error(`Element ${source} not found.`);
    }

    const closest = findClosestElement(
      sourceElement,
      childElements,
      elements.root,
      direction,
    );

    it(`the ${Direction[direction]} of element ${source} it should be ${expected}`, () => {
      expect(closest?.id ?? null).toBe(expected);
    });
  }
}

suite('findClosestElement', () => {
  describe('should return the correct element for a simple layout', () => {
    /**
     *         400
     * ╔═════════════════╗
     * ║        1        ║  100
     * ╠═════╦═════╦═════╣
     * ║     ║     ║     ║
     * ║     ║  3  ║  4  ║  200
     * ║  2  ╠═════╩═════╣
     * ║     ║     5     ║  100
     * ╚═════╩═══════════╝
     *   150      250
     */
    const elements = createLayout(400, 400, [
      { x: 0, y: 0, w: 400, h: 100 },
      { x: 0, y: 100, w: 150, h: 300 },
      { x: 150, y: 100, w: 125, h: 200 },
      { x: 275, y: 100, w: 125, h: 200 },
      { x: 150, y: 300, w: 250, h: 100 },
    ]);
    const tests: TestCases = [
      [1, Direction.Up, null],
      [1, Direction.Right, null],
      [1, Direction.Down, 3],
      [1, Direction.Left, null],
      [2, Direction.Up, 1],
      [2, Direction.Right, 3],
      [2, Direction.Down, null],
      [2, Direction.Left, null],
      [3, Direction.Up, 1],
      [3, Direction.Right, 4],
      [3, Direction.Down, 5],
      [3, Direction.Left, 2],
      [4, Direction.Up, 1],
      [4, Direction.Right, null],
      [4, Direction.Down, 5],
      [4, Direction.Left, 3],
      [5, Direction.Up, 3],
      [5, Direction.Right, null],
      [5, Direction.Down, null],
      [5, Direction.Left, 2],
    ];

    runTestsOnElements(elements, tests);
  });

  describe('should return the correct element for a tiered layout', () => {
    /**
     *  100 100 100 100 100
     * ╔═══╦═══╦═══╦═══╦═══╗
     * ║ 1 ║ 2 ║ 3 ║ 4 ║ 5 ║  100
     * ╠═══╩═══╩═╦═╩═══╩═══╣
     * ║         ║         ║
     * ║    6    ║    7    ║  200
     * ╠═════════╩═════════╣
     * ║                   ║
     * ║         8         ║  200
     * ╚═══════════════════╝
     *          500
     */
    const elements = createLayout(500, 500, [
      { x: 0, y: 0, w: 100, h: 100 },
      { x: 100, y: 0, w: 100, h: 100 },
      { x: 200, y: 0, w: 100, h: 100 },
      { x: 300, y: 0, w: 100, h: 100 },
      { x: 400, y: 0, w: 100, h: 100 },
      { x: 0, y: 100, w: 250, h: 200 },
      { x: 250, y: 100, w: 250, h: 200 },
      { x: 0, y: 300, w: 500, h: 200 },
    ]);
    const tests: TestCases = [
      [1, Direction.Up, null],
      [1, Direction.Right, 2],
      [1, Direction.Down, 6],
      [1, Direction.Left, null],
      [2, Direction.Up, null],
      [2, Direction.Right, 3],
      [2, Direction.Down, 6],
      [2, Direction.Left, 1],
      [3, Direction.Up, null],
      [3, Direction.Right, 4],
      [3, Direction.Down, 6],
      [3, Direction.Left, 2],
      [4, Direction.Up, null],
      [4, Direction.Right, 5],
      [4, Direction.Down, 7],
      [4, Direction.Left, 3],
      [5, Direction.Up, null],
      [5, Direction.Right, null],
      [5, Direction.Down, 7],
      [5, Direction.Left, 4],
      [6, Direction.Up, 2],
      [6, Direction.Right, 7],
      [6, Direction.Down, 8],
      [6, Direction.Left, null],
      [7, Direction.Up, 4],
      [7, Direction.Right, null],
      [7, Direction.Down, 8],
      [7, Direction.Left, 6],
      [8, Direction.Up, 6],
      [8, Direction.Right, null],
      [8, Direction.Down, null],
      [8, Direction.Left, null],
    ];

    runTestsOnElements(elements, tests);
  });

  describe('should return the correct element for a scattered layout', () => {
    /**
     * ┌─────────────────┐
     * │ ╔═══╗           │
     * │ ║ 1 ║      ╔═══╗│
     * │ ╚═══╝      ║ 2 ║│
     * │    ╔═══╗   ╚═══╝│
     * │    ║ 3 ║  ╔═══╗ │
     * │    ╚═══╝  ║ 5 ║ │
     * │  ╔═══╗    ╚═══╝ │
     * │  ║ 4 ║          │
     * │  ╚═══╝          │
     * └─────────────────┘
     */
    const elements = createLayout(600, 600, [
      { x: 100, y: 100, w: 100, h: 100 },
      { x: 500, y: 150, w: 100, h: 100 },
      { x: 150, y: 250, w: 100, h: 100 },
      { x: 125, y: 400, w: 100, h: 100 },
      { x: 450, y: 300, w: 100, h: 100 },
    ]);
    const tests: TestCases = [
      [1, Direction.Up, null],
      [1, Direction.Right, 2],
      [1, Direction.Down, 3],
      [1, Direction.Left, null],
      [2, Direction.Up, null],
      [2, Direction.Right, null],
      [2, Direction.Down, 5],
      [2, Direction.Left, 1],
      [3, Direction.Up, 1],
      [3, Direction.Right, 5],
      [3, Direction.Down, 4],
      [3, Direction.Left, null],
      [4, Direction.Up, 3],
      [4, Direction.Right, null],
      [4, Direction.Down, null],
      [4, Direction.Left, null],
      [5, Direction.Up, 2],
      [5, Direction.Right, null],
      [5, Direction.Down, null],
      [5, Direction.Left, 3],
    ];

    runTestsOnElements(elements, tests);
  });

  describe('should return the correct element for an overlapped layout', () => {
    /**    200 200  100
     * ┌─────────────────┐
     * │ ╔═════╗         │  100
     * │ ║  1  ║══╗      │
     * │ ╚══╦══╝  ║      │  200
     * │    ║  2  ║╔═══╗ │
     * │    ╚═════╝║ 3 ║ │  100
     * │  ╔═══╗    ╚═══╝ │
     * │  ║ 4 ║          │  100
     * │  ╚═══╝          │
     * └─────────────────┘
     *     100
     */
    const elements = createLayout(500, 500, [
      { x: 50, y: 50, w: 200, h: 100 },
      { x: 150, y: 100, w: 200, h: 200 },
      { x: 400, y: 250, w: 100, h: 100 },
      { x: 100, y: 350, w: 100, h: 100 },
    ]);
    const tests: TestCases = [
      [1, Direction.Up, null],
      [1, Direction.Right, 2],
      [1, Direction.Down, 2],
      [1, Direction.Left, null],
      [2, Direction.Up, 1],
      [2, Direction.Right, 3],
      [2, Direction.Down, 4],
      [2, Direction.Left, 1],
      [3, Direction.Up, null],
      [3, Direction.Right, null],
      [3, Direction.Down, null],
      [3, Direction.Left, 2],
      [4, Direction.Up, 2],
      [4, Direction.Right, null],
      [4, Direction.Down, null],
      [4, Direction.Left, null],
    ];

    runTestsOnElements(elements, tests);
  });

  describe('should return the correct element for a wide element in the middle', () => {
    /**
     * ┌─────────────────┐
     * │ ╔══════╗        │
     * │ ║   1  ║        │
     * │ ╚══════╝        │
     * │ ╔═══════════╗   │
     * │ ║     2     ║   │
     * │ ╚═══════════╝   │
     * │ ╔═══╗           │
     * │ ║ 3 ║           │
     * │ ╚═══╝           │
     * └─────────────────┘
     */
    const elements = createLayout(500, 500, [
      { h: 48, w: 243, x: 160, y: 24 },
      { h: 96, w: 450, x: 160, y: 88 },
      { h: 64, w: 150, x: 160, y: 264 },
    ]);
    const tests: TestCases = [
      [1, Direction.Up, null],
      [1, Direction.Right, null],
      [1, Direction.Down, 2],
      [1, Direction.Left, null],
      [2, Direction.Up, 1],
      [2, Direction.Right, null],
      [2, Direction.Down, 3],
      [2, Direction.Left, null],
      [3, Direction.Up, 2],
      [3, Direction.Right, null],
      [3, Direction.Down, null],
      [3, Direction.Left, null],
    ];

    runTestsOnElements(elements, tests);
  });
});

suite('getOverlap', () => {
  it('should return the correct overlap for two elements', () => {
    const a = { x: 0, y: 0, w: 100, h: 100, centerX: 50, centerY: 50 };
    const b = {
      x: 75,
      y: 75,
      w: 100,
      h: 100,
      centerX: 50,
      centerY: 50,
    };

    expect(getOverlap(Direction.Up, a, b)).toEqual(0);
    expect(getOverlap(Direction.Right, a, b)).toEqual(25);
    expect(getOverlap(Direction.Down, a, b)).toEqual(25);
    expect(getOverlap(Direction.Left, a, b)).toEqual(0);
  });
});
