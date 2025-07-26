import type { LightningElementStyle } from '@plextv/react-lightning';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { YogaOptions } from './types/YogaOptions';
import { SimpleDataView } from './util/SimpleDataView';
import { YogaManager } from './YogaManager';

// Mock the yoga-layout/load module
const mockNode = {
  create: vi.fn(),
  free: vi.fn(),
  insertChild: vi.fn(),
  calculateLayout: vi.fn(),
  hasNewLayout: vi.fn(),
  getComputedLayout: vi.fn(),
  getComputedWidth: vi.fn(),
  getMaxWidth: vi.fn(),
  getParent: vi.fn(),
  markLayoutSeen: vi.fn(),
};

const mockConfig = {
  create: vi.fn(),
  setUseWebDefaults: vi.fn(),
  setErrata: vi.fn(),
};

const mockYogaOptions = {
  errata: 'none',
  expandToAutoFlexBasis: false,
  processHiddenNodes: false,
  useWebDefaults: false,
  useWebWorker: false,
};

const mockYoga = {
  Node: {
    create: vi.fn(() => mockNode),
  },
  Config: {
    create: vi.fn(() => mockConfig),
  },
  DIRECTION_LTR: 0,
  UNIT_UNDEFINED: 0,
  UNIT_PERCENT: 1,
  UNIT_POINT: 2,
  ERRATA_NONE: 0,
  ERRATA_ALL: 1,
  ERRATA_CLASSIC: 2,
  ERRATA_STRETCH_FLEX_BASIS: 3,
  ERRATA_ABSOLUTE_PERCENT_AGAINST_INNER_SIZE: 4,
  ERRATA_ABSOLUTE_POSITION_WITHOUT_INSETS_EXCLUDES_PADDING: 5,
};

vi.mock('yoga-layout/load', () => ({
  loadYoga: vi.fn(() => Promise.resolve(mockYoga)),
}));

// Mock the applyReactPropsToYoga utility
vi.mock('./util/applyReactPropsToYoga', () => ({
  default: vi.fn(),
  applyFlexPropToYoga: vi.fn(),
}));

describe('YogaManager', () => {
  let yogaManager: YogaManager;

  beforeEach(() => {
    yogaManager = new YogaManager();

    // Reset mock implementations
    mockNode.hasNewLayout.mockReturnValue(true);
    mockNode.getComputedLayout.mockReturnValue({
      left: 10,
      top: 20,
      width: 100,
      height: 50,
    });
    mockNode.getComputedWidth.mockReturnValue(100);
    mockNode.getMaxWidth.mockReturnValue({
      value: NaN,
      unit: mockYoga.UNIT_UNDEFINED,
    });
    mockNode.getParent.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default options', async () => {
      await yogaManager.init();

      expect(yogaManager.initialized).toBe(true);
      expect(mockConfig.setUseWebDefaults).toHaveBeenCalledWith(false);
      expect(mockConfig.setErrata).toHaveBeenCalledWith(mockYoga.ERRATA_NONE);
    });

    it('should initialize with custom options', async () => {
      const options: YogaOptions = {
        useWebDefaults: true,
        errata: 'all',
        processHiddenNodes: true,
        useWebWorker: false,
      };

      await yogaManager.init(options);

      expect(yogaManager.initialized).toBe(true);
      expect(mockConfig.setUseWebDefaults).toHaveBeenCalledWith(true);
      expect(mockConfig.setErrata).toHaveBeenCalledWith(mockYoga.ERRATA_ALL);
    });

    it('should handle different errata options', async () => {
      const errataTests = [
        { errata: 'classic' as const, expected: mockYoga.ERRATA_CLASSIC },
        {
          errata: 'stretch-flex-basis' as const,
          expected: mockYoga.ERRATA_STRETCH_FLEX_BASIS,
        },
        {
          errata: 'absolute-percent-against-inner' as const,
          expected: mockYoga.ERRATA_ABSOLUTE_PERCENT_AGAINST_INNER_SIZE,
        },
        {
          errata: 'absolute-position-without-insets' as const,
          expected:
            mockYoga.ERRATA_ABSOLUTE_POSITION_WITHOUT_INSETS_EXCLUDES_PADDING,
        },
        { errata: 'none' as const, expected: mockYoga.ERRATA_NONE },
      ];

      for (const { errata, expected } of errataTests) {
        vi.clearAllMocks();
        const manager = new YogaManager();
        await manager.init({ errata });
        expect(mockConfig.setErrata).toHaveBeenCalledWith(expected);
      }
    });
  });

  describe('node management', () => {
    beforeEach(async () => {
      await yogaManager.init();
    });

    it('should add a new node', () => {
      const elementId = 123;
      const node = yogaManager.addNode(elementId);

      expect(node).toBeDefined();
      expect(node.id).toBe(elementId);
      expect(node.children).toEqual([]);
      expect(mockYoga.Node.create).toHaveBeenCalledWith(mockConfig);
    });

    it('should return existing node if already added', () => {
      const elementId = 123;
      const node1 = yogaManager.addNode(elementId);
      const node2 = yogaManager.addNode(elementId);

      expect(node1).toBe(node2);
      expect(mockYoga.Node.create).toHaveBeenCalledTimes(1);
    });

    it('should remove a node', () => {
      const elementId = 123;
      yogaManager.addNode(elementId);
      yogaManager.removeNode(elementId);

      expect(mockNode.free).toHaveBeenCalled();
    });

    it('should remove a node from parent children array', () => {
      const parentId = 1;
      const childId = 2;

      const parentNode = yogaManager.addNode(parentId);
      const childNode = yogaManager.addNode(childId);

      // Manually set up parent-child relationship for testing
      parentNode.children.push(childNode);
      childNode.parent = parentNode;

      yogaManager.removeNode(childId);

      expect(parentNode.children).toHaveLength(0);
      expect(mockNode.free).toHaveBeenCalled();
    });

    it('should handle removing non-existent node', () => {
      yogaManager.removeNode(999);
      expect(mockNode.free).not.toHaveBeenCalled();
    });
  });

  describe('child node management', () => {
    beforeEach(async () => {
      await yogaManager.init();
    });

    it('should add child node to parent', () => {
      const parentId = 1;
      const childId = 2;
      const index = 0;

      yogaManager.addNode(parentId);
      yogaManager.addNode(childId);
      yogaManager.addChildNode(parentId, childId, index);

      expect(mockNode.insertChild).toHaveBeenCalledWith(mockNode, index);
    });

    it('should throw error when parent node not found', () => {
      const parentId = 999;
      const childId = 2;
      const index = 0;

      yogaManager.addNode(childId);

      expect(() => {
        yogaManager.addChildNode(parentId, childId, index);
      }).toThrow('Parent or child node not found for IDs 999 and 2.');
    });

    it('should throw error when child node not found', () => {
      const parentId = 1;
      const childId = 999;
      const index = 0;

      yogaManager.addNode(parentId);

      expect(() => {
        yogaManager.addChildNode(parentId, childId, index);
      }).toThrow('Parent or child node not found for IDs 1 and 999.');
    });
  });

  describe('render queue', () => {
    beforeEach(async () => {
      await yogaManager.init({
        errata: 'all',
      });
    });

    it('should throw error when not initialized', () => {
      const uninitializedManager = new YogaManager();
      expect(() => {
        uninitializedManager.queueRender(123);
      }).toThrow('Yoga is not initialized! Did you call `init()`?');
    });

    it('should queue render for existing node', () => {
      return new Promise<void>((resolve) => {
        const elementId = 123;

        yogaManager.addNode(elementId);

        yogaManager.on('render', (buffer) => {
          expect(buffer).toBeInstanceOf(ArrayBuffer);
          expect(mockNode.calculateLayout).toHaveBeenCalledWith(
            1920,
            1080,
            mockYoga.DIRECTION_LTR,
          );
          resolve();
        });

        yogaManager.queueRender(elementId);
      });
    });

    it('should handle queueing render for non-existent node', () => {
      return new Promise<void>((resolve, reject) => {
        const elementId = 999;

        // Should not emit render event
        yogaManager.on('render', () => {
          reject('Should not emit render event for non-existent node');
        });

        yogaManager.queueRender(elementId);

        // Wait a bit to ensure no event is emitted
        setTimeout(() => {
          resolve();
        }, 10);
      });
    });

    it('should clear previous timeout when queueing multiple renders', () => {
      return new Promise<void>((resolve) => {
        const elementId = 123;

        yogaManager.addNode(elementId);
        yogaManager.queueRender(elementId);

        // Should only calculate layout once after both calls
        setTimeout(() => {
          expect(mockNode.calculateLayout).toHaveBeenCalledTimes(1);
          resolve();
        }, 10);
      });
    });

    it('should return a properly formatted ArrayBuffer', () => {
      return new Promise<void>((resolve) => {
        const rootId = 0;
        const numNodes = 100;

        yogaManager.addNode(rootId);

        for (let i = 1; i < numNodes; i++) {
          yogaManager.addNode(i);
          yogaManager.addChildNode(rootId, i, i);
        }

        yogaManager.on('render', (arrayBuffer) => {
          expect(arrayBuffer.byteLength).toBeGreaterThan(0); // Ensure some data is present

          const dataView = new SimpleDataView(arrayBuffer);

          // Check each node's data
          for (let i = 0; i < numNodes; i++) {
            expect(dataView.readUint32()).toBe(i); // Node ID
            expect(dataView.readInt16()).toBe(10); // x
            expect(dataView.readInt16()).toBe(20); // y
            expect(dataView.readInt16()).toBe(100); // width
            expect(dataView.readInt16()).toBe(50); // height
          }

          resolve();
        });

        yogaManager.queueRender(rootId);
      });
    });
  });

  describe('style application', () => {
    beforeEach(async () => {
      await yogaManager.init();
    });

    it('should throw error when not initialized', () => {
      const uninitializedManager = new YogaManager();
      expect(() => {
        uninitializedManager.applyStyle(123, {});
      }).toThrow('Yoga was not initialized! Did you call `init()`?');
    });

    it('should apply style to existing node', async () => {
      const elementId = 123;
      const style: Partial<LightningElementStyle> = {
        width: 100,
        height: 50,
      };

      yogaManager.addNode(elementId);
      yogaManager.applyStyle(elementId, style);

      // applyReactPropsToYoga should be called with the mocked function
      const { default: applyReactPropsToYoga } = await import(
        './util/applyReactPropsToYoga'
      );
      expect(applyReactPropsToYoga).toHaveBeenCalledWith(
        mockYoga,
        mockYogaOptions,
        mockNode,
        style,
      );
    });

    it('should handle style application to non-existent node', () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      yogaManager.applyStyle(999, {});

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Yoga node with ID 999 not found.',
      );
      consoleWarnSpy.mockRestore();
    });

    it('should apply transform styles', async () => {
      const elementId = 123;
      const style: Partial<LightningElementStyle> = {
        x: 10,
        y: 20,
        transform: {
          translateX: 5,
          translateY: 10,
        },
      };

      yogaManager.addNode(elementId);
      yogaManager.applyStyle(elementId, style);

      const { applyFlexPropToYoga } = await import(
        './util/applyReactPropsToYoga'
      );
      expect(applyFlexPropToYoga).toHaveBeenCalledWith(
        mockYoga,
        mockYogaOptions,
        mockNode,
        'left',
        15,
      ); // x + translateX
      expect(applyFlexPropToYoga).toHaveBeenCalledWith(
        mockYoga,
        mockYogaOptions,
        mockNode,
        'top',
        30,
      ); // y + translateY
    });

    it('should apply multiple styles', async () => {
      const styles = {
        123: { width: 100, height: 50 },
        456: { width: 200, height: 100 },
      };

      yogaManager.addNode(123);
      yogaManager.addNode(456);
      yogaManager.applyStyles(styles);

      const { default: applyReactPropsToYoga } = await import(
        './util/applyReactPropsToYoga'
      );
      expect(applyReactPropsToYoga).toHaveBeenCalledTimes(2);
    });
  });

  describe('clamped size calculation', () => {
    beforeEach(async () => {
      await yogaManager.init();
    });

    it('should throw error when not initialized', () => {
      const uninitializedManager = new YogaManager();
      expect(() => {
        uninitializedManager.getClampedSize(123);
      }).toThrow('Yoga was not initialized! Did you call `init()`?');
    });

    it('should return null for non-existent node', () => {
      const result = yogaManager.getClampedSize(999);
      expect(result).toBeNull();
    });

    it('should return null when no max width is set', () => {
      const elementId = 123;
      yogaManager.addNode(elementId);

      mockNode.getMaxWidth.mockReturnValue({
        value: NaN,
        unit: mockYoga.UNIT_UNDEFINED,
      });

      const result = yogaManager.getClampedSize(elementId);
      expect(result).toBeNull();
    });

    it('should return computed width when max width is set', () => {
      const elementId = 123;
      yogaManager.addNode(elementId);

      mockNode.getMaxWidth.mockReturnValue({
        value: 150,
        unit: mockYoga.UNIT_POINT,
      });
      mockNode.getComputedWidth.mockReturnValue(100);

      const result = yogaManager.getClampedSize(elementId);
      expect(result).toBe(100);
    });

    it('should calculate percentage-based max width', () => {
      const elementId = 123;
      yogaManager.addNode(elementId);

      const parentNode = { getComputedWidth: vi.fn(() => 200) };
      mockNode.getMaxWidth.mockReturnValue({
        value: 50,
        unit: mockYoga.UNIT_PERCENT,
      });
      mockNode.getComputedWidth.mockReturnValue(NaN);
      mockNode.getParent.mockReturnValue(parentNode);

      const result = yogaManager.getClampedSize(elementId);
      expect(result).toBe(100); // parent width when percentage
    });

    it('should use max width value when no parent and unit is point', () => {
      const elementId = 123;
      yogaManager.addNode(elementId);

      mockNode.getMaxWidth.mockReturnValue({
        value: 150,
        unit: mockYoga.UNIT_POINT,
      });
      mockNode.getComputedWidth.mockReturnValue(NaN);
      mockNode.getParent.mockReturnValue(null);

      const result = yogaManager.getClampedSize(elementId);
      expect(result).toBe(150);
    });
  });

  describe('event emitter', () => {
    it('should support on/off event listeners', () => {
      const listener = vi.fn();

      yogaManager.on('render', listener);
      yogaManager.off('render', listener);

      // Event emitter methods should be bound correctly
      expect(typeof yogaManager.on).toBe('function');
      expect(typeof yogaManager.off).toBe('function');
    });
  });
});
