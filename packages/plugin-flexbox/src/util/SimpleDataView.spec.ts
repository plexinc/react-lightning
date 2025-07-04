import { describe, expect, it, vi } from 'vitest';
import { SimpleDataView } from './SimpleDataView';

describe('SimpleDataView', () => {
  describe('constructor', () => {
    it('should create instance with default maxSize', () => {
      const dataView = new SimpleDataView();
      expect(dataView.fullBuffer.byteLength).toBe(1024 * 1000);
    });

    it('should create instance with custom maxSize', () => {
      const dataView = new SimpleDataView(2048);
      expect(dataView.fullBuffer.byteLength).toBe(2048);
    });

    it('should create instance with overflow handler', () => {
      const overflowHandler = vi.fn();
      const dataView = new SimpleDataView(1024, true, overflowHandler);
      expect(dataView.fullBuffer.byteLength).toBe(1024);
    });
  });

  describe('constructor with littleEndian parameter', () => {
    it('should create instance with littleEndian true by default', () => {
      const dataView = new SimpleDataView();
      dataView.writeUint16(0x1234);

      const buffer = dataView.buffer;
      const view = new DataView(buffer);
      expect(view.getUint16(0, true)).toBe(0x1234); // little endian
    });

    it('should create instance with littleEndian false when specified', () => {
      const dataView = new SimpleDataView(1024, false);
      dataView.writeUint16(0x1234);

      const buffer = dataView.buffer;
      const view = new DataView(buffer);
      expect(view.getUint16(0, false)).toBe(0x1234); // big endian
    });

    it('should create instance with custom maxSize, littleEndian, and overflow handler', () => {
      const overflowHandler = vi.fn();
      const dataView = new SimpleDataView(2048, false, overflowHandler);
      expect(dataView.fullBuffer.byteLength).toBe(2048);
    });
  });

  describe('buffer property', () => {
    it('should return empty buffer when no data written', () => {
      const dataView = new SimpleDataView();
      expect(dataView.buffer.byteLength).toBe(0);
    });

    it('should return buffer with correct size after writing data', () => {
      const dataView = new SimpleDataView();
      dataView.writeUint8(42);
      dataView.writeUint16(1000);
      expect(dataView.buffer.byteLength).toBe(3); // 1 + 2 bytes
    });
  });

  describe('fullBuffer property', () => {
    it('should return full buffer regardless of written data', () => {
      const dataView = new SimpleDataView(1024);
      dataView.writeUint8(42);
      expect(dataView.fullBuffer.byteLength).toBe(1024);
    });
  });

  describe('dataView property', () => {
    it('should return DataView instance', () => {
      const dataView = new SimpleDataView();
      expect(dataView.dataView).toBeInstanceOf(DataView);
    });
  });

  describe('reset method', () => {
    it('should reset offset to 0', () => {
      const dataView = new SimpleDataView();
      dataView.writeUint8(42);
      dataView.writeUint16(1000);
      expect(dataView.buffer.byteLength).toBe(3);

      dataView.reset();
      expect(dataView.buffer.byteLength).toBe(0);
    });
  });

  describe('hasSpace method', () => {
    it('should return true when there is enough space', () => {
      const dataView = new SimpleDataView(1024);
      expect(dataView.hasSpace(100)).toBe(true);
    });

    it('should return false when there is not enough space', () => {
      const dataView = new SimpleDataView(10);
      dataView.writeUint32(42); // 4 bytes
      expect(dataView.hasSpace(10)).toBe(false);
    });

    it('should return true when exactly enough space', () => {
      const dataView = new SimpleDataView(10);
      dataView.writeUint32(42); // 4 bytes
      expect(dataView.hasSpace(6)).toBe(true);
    });
  });

  describe('writeUint8 method', () => {
    it('should write uint8 value correctly', () => {
      const dataView = new SimpleDataView();
      dataView.writeUint8(255);

      const buffer = dataView.buffer;
      const view = new DataView(buffer);
      expect(view.getUint8(0)).toBe(255);
      expect(buffer.byteLength).toBe(1);
    });

    it('should write multiple uint8 values', () => {
      const dataView = new SimpleDataView();
      dataView.writeUint8(10);
      dataView.writeUint8(20);
      dataView.writeUint8(30);

      const buffer = dataView.buffer;
      const view = new DataView(buffer);
      expect(view.getUint8(0)).toBe(10);
      expect(view.getUint8(1)).toBe(20);
      expect(view.getUint8(2)).toBe(30);
      expect(buffer.byteLength).toBe(3);
    });
  });

  describe('writeUint16 method', () => {
    it('should write uint16 value correctly (little endian)', () => {
      const dataView = new SimpleDataView();
      dataView.writeUint16(65535);

      const buffer = dataView.buffer;
      const view = new DataView(buffer);
      expect(view.getUint16(0, true)).toBe(65535);
      expect(buffer.byteLength).toBe(2);
    });

    it('should write multiple uint16 values', () => {
      const dataView = new SimpleDataView();
      dataView.writeUint16(1000);
      dataView.writeUint16(2000);

      const buffer = dataView.buffer;
      const view = new DataView(buffer);
      expect(view.getUint16(0, true)).toBe(1000);
      expect(view.getUint16(2, true)).toBe(2000);
      expect(buffer.byteLength).toBe(4);
    });
  });

  describe('writeUint32 method', () => {
    it('should write uint32 value correctly (little endian)', () => {
      const dataView = new SimpleDataView();
      dataView.writeUint32(4294967295);

      const buffer = dataView.buffer;
      const view = new DataView(buffer);
      expect(view.getUint32(0, true)).toBe(4294967295);
      expect(buffer.byteLength).toBe(4);
    });

    it('should write multiple uint32 values', () => {
      const dataView = new SimpleDataView();
      dataView.writeUint32(100000);
      dataView.writeUint32(200000);

      const buffer = dataView.buffer;
      const view = new DataView(buffer);
      expect(view.getUint32(0, true)).toBe(100000);
      expect(view.getUint32(4, true)).toBe(200000);
      expect(buffer.byteLength).toBe(8);
    });
  });

  describe('writeInt8 method', () => {
    it('should write positive int8 value correctly', () => {
      const dataView = new SimpleDataView();
      dataView.writeInt8(127);

      const buffer = dataView.buffer;
      const view = new DataView(buffer);
      expect(view.getInt8(0)).toBe(127);
      expect(buffer.byteLength).toBe(1);
    });

    it('should write negative int8 value correctly', () => {
      const dataView = new SimpleDataView();
      dataView.writeInt8(-128);

      const buffer = dataView.buffer;
      const view = new DataView(buffer);
      expect(view.getInt8(0)).toBe(-128);
      expect(buffer.byteLength).toBe(1);
    });
  });

  describe('writeInt16 method', () => {
    it('should write positive int16 value correctly (little endian)', () => {
      const dataView = new SimpleDataView();
      dataView.writeInt16(32767);

      const buffer = dataView.buffer;
      const view = new DataView(buffer);
      expect(view.getInt16(0, true)).toBe(32767);
      expect(buffer.byteLength).toBe(2);
    });

    it('should write negative int16 value correctly (little endian)', () => {
      const dataView = new SimpleDataView();
      dataView.writeInt16(-32768);

      const buffer = dataView.buffer;
      const view = new DataView(buffer);
      expect(view.getInt16(0, true)).toBe(-32768);
      expect(buffer.byteLength).toBe(2);
    });
  });

  describe('writeInt32 method', () => {
    it('should write positive int32 value correctly (little endian)', () => {
      const dataView = new SimpleDataView();
      dataView.writeInt32(2147483647);

      const buffer = dataView.buffer;
      const view = new DataView(buffer);
      expect(view.getInt32(0, true)).toBe(2147483647);
      expect(buffer.byteLength).toBe(4);
    });

    it('should write negative int32 value correctly (little endian)', () => {
      const dataView = new SimpleDataView();
      dataView.writeInt32(-2147483648);

      const buffer = dataView.buffer;
      const view = new DataView(buffer);
      expect(view.getInt32(0, true)).toBe(-2147483648);
      expect(buffer.byteLength).toBe(4);
    });
  });

  describe('shift method', () => {
    it('should shift offset back by specified size', () => {
      const dataView = new SimpleDataView();
      dataView.writeUint8(10);
      dataView.writeUint16(20);
      dataView.writeUint32(30);
      expect(dataView.buffer.byteLength).toBe(7); // 1 + 2 + 4 bytes

      dataView.shift(4); // Move back 4 bytes
      expect(dataView.buffer.byteLength).toBe(3); // Should be 3 bytes now
    });

    it('should allow writing after shifting', () => {
      const dataView = new SimpleDataView();
      dataView.writeUint32(100);
      dataView.shift(2); // Move back 2 bytes
      dataView.writeUint16(200); // Overwrite last 2 bytes

      const buffer = dataView.buffer;
      const view = new DataView(buffer);
      expect(view.getUint16(0, true)).toBe(100); // First 2 bytes of original uint32
      expect(view.getUint16(2, true)).toBe(200); // New uint16 value
      expect(buffer.byteLength).toBe(4);
    });

    it('should throw error when shifting more than current offset', () => {
      const dataView = new SimpleDataView();
      dataView.writeUint8(42);

      expect(() => dataView.shift(2)).toThrow(
        'Cannot shift more than current offset',
      );
    });

    it('should throw error when shifting from zero offset', () => {
      const dataView = new SimpleDataView();

      expect(() => dataView.shift(1)).toThrow(
        'Cannot shift more than current offset',
      );
    });
  });

  describe('moveTo method', () => {
    it('should move to specified offset', () => {
      const dataView = new SimpleDataView();
      dataView.writeUint32(100);
      expect(dataView.buffer.byteLength).toBe(4);

      dataView.moveTo(2);
      dataView.writeUint16(200);
      expect(dataView.buffer.byteLength).toBe(4); // Still 4 bytes total

      const buffer = dataView.buffer;
      const view = new DataView(buffer);
      expect(view.getUint16(0, true)).toBe(100); // First 2 bytes of original uint32
      expect(view.getUint16(2, true)).toBe(200); // New uint16 at offset 2
    });

    it('should allow moving to offset 0', () => {
      const dataView = new SimpleDataView();
      dataView.writeUint32(100);
      dataView.moveTo(0);
      dataView.writeUint8(50);

      const buffer = dataView.buffer;
      const view = new DataView(buffer);
      expect(view.getUint8(0)).toBe(50);
      expect(buffer.byteLength).toBe(1);
    });

    it('should throw error when offset is negative', () => {
      const dataView = new SimpleDataView();

      expect(() => dataView.moveTo(-1)).toThrow('Offset out of bounds');
    });

    it('should throw error when offset is greater than or equal to maxSize', () => {
      const dataView = new SimpleDataView(1024);

      expect(() => dataView.moveTo(1024)).toThrow('Offset out of bounds');
      expect(() => dataView.moveTo(1025)).toThrow('Offset out of bounds');
    });
  });

  describe('getUint8 method', () => {
    it('should read uint8 value and advance offset', () => {
      const dataView = new SimpleDataView();
      dataView.writeUint8(42);
      dataView.writeUint8(100);
      dataView.moveTo(0); // Reset to beginning

      const firstValue = dataView.readUint8();
      const secondValue = dataView.readUint8();

      expect(firstValue).toBe(42);
      expect(secondValue).toBe(100);
    });

    it('should handle overflow when reading beyond buffer', () => {
      const overflowHandler = vi.fn();
      const dataView = new SimpleDataView(4, true, overflowHandler);
      dataView.writeUint32(0x12345678);
      dataView.moveTo(0);

      // Read all 4 bytes
      dataView.readUint8();
      dataView.readUint8();
      dataView.readUint8();
      dataView.readUint8();

      // This should trigger overflow
      dataView.readUint8();

      expect(overflowHandler).toHaveBeenCalledTimes(1);
    });

    it('should throw error when reading beyond buffer without handler', () => {
      const dataView = new SimpleDataView(4);
      dataView.writeUint32(0x12345678);
      dataView.moveTo(0);

      // Read all 4 bytes
      dataView.readUint8();
      dataView.readUint8();
      dataView.readUint8();
      dataView.readUint8();

      // This should throw error
      expect(() => dataView.readUint8()).toThrow('Buffer overflowed');
    });
  });

  describe('getUint16 method', () => {
    it('should read uint16 value and advance offset', () => {
      const dataView = new SimpleDataView();
      dataView.writeUint16(1000);
      dataView.writeUint16(2000);
      dataView.moveTo(0); // Reset to beginning

      const firstValue = dataView.readUint16();
      const secondValue = dataView.readUint16();

      expect(firstValue).toBe(1000);
      expect(secondValue).toBe(2000);
    });

    it('should read uint16 values with correct endianness', () => {
      const littleEndianView = new SimpleDataView(1024, true);
      const bigEndianView = new SimpleDataView(1024, false);

      littleEndianView.writeUint16(0x1234);
      bigEndianView.writeUint16(0x1234);

      littleEndianView.moveTo(0);
      bigEndianView.moveTo(0);

      expect(littleEndianView.readUint16()).toBe(0x1234);
      expect(bigEndianView.readUint16()).toBe(0x1234);
    });

    it('should throw error when reading beyond buffer', () => {
      const dataView = new SimpleDataView(1);
      dataView.writeUint8(42);
      dataView.moveTo(0);
      dataView.readUint8(); // Read the byte

      expect(() => dataView.readUint16()).toThrow('Buffer overflowed');
    });
  });

  describe('getUint32 method', () => {
    it('should read uint32 value and advance offset', () => {
      const dataView = new SimpleDataView();
      dataView.writeUint32(100000);
      dataView.writeUint32(200000);
      dataView.moveTo(0); // Reset to beginning

      const firstValue = dataView.readUint32();
      const secondValue = dataView.readUint32();

      expect(firstValue).toBe(100000);
      expect(secondValue).toBe(200000);
    });

    it('should read uint32 values with correct endianness', () => {
      const littleEndianView = new SimpleDataView(1024, true);
      const bigEndianView = new SimpleDataView(1024, false);

      littleEndianView.writeUint32(0x12345678);
      bigEndianView.writeUint32(0x12345678);

      littleEndianView.moveTo(0);
      bigEndianView.moveTo(0);

      expect(littleEndianView.readUint32()).toBe(0x12345678);
      expect(bigEndianView.readUint32()).toBe(0x12345678);
    });

    it('should handle maximum uint32 value', () => {
      const dataView = new SimpleDataView();
      dataView.writeUint32(4294967295);
      dataView.moveTo(0);

      expect(dataView.readUint32()).toBe(4294967295);
    });
  });

  describe('getInt8 method', () => {
    it('should read positive int8 value and advance offset', () => {
      const dataView = new SimpleDataView();
      dataView.writeInt8(127);
      dataView.writeInt8(42);
      dataView.moveTo(0);

      const firstValue = dataView.readInt8();
      const secondValue = dataView.readInt8();

      expect(firstValue).toBe(127);
      expect(secondValue).toBe(42);
    });

    it('should read negative int8 value correctly', () => {
      const dataView = new SimpleDataView();
      dataView.writeInt8(-128);
      dataView.writeInt8(-1);
      dataView.moveTo(0);

      const firstValue = dataView.readInt8();
      const secondValue = dataView.readInt8();

      expect(firstValue).toBe(-128);
      expect(secondValue).toBe(-1);
    });

    it('should handle mixed positive and negative values', () => {
      const dataView = new SimpleDataView();
      dataView.writeInt8(100);
      dataView.writeInt8(-50);
      dataView.writeInt8(0);
      dataView.moveTo(0);

      expect(dataView.readInt8()).toBe(100);
      expect(dataView.readInt8()).toBe(-50);
      expect(dataView.readInt8()).toBe(0);
    });
  });

  describe('getInt16 method', () => {
    it('should read positive int16 value and advance offset', () => {
      const dataView = new SimpleDataView();
      dataView.writeInt16(32767);
      dataView.writeInt16(1000);
      dataView.moveTo(0);

      const firstValue = dataView.readInt16();
      const secondValue = dataView.readInt16();

      expect(firstValue).toBe(32767);
      expect(secondValue).toBe(1000);
    });

    it('should read negative int16 value correctly', () => {
      const dataView = new SimpleDataView();
      dataView.writeInt16(-32768);
      dataView.writeInt16(-1000);
      dataView.moveTo(0);

      const firstValue = dataView.readInt16();
      const secondValue = dataView.readInt16();

      expect(firstValue).toBe(-32768);
      expect(secondValue).toBe(-1000);
    });

    it('should read int16 values with correct endianness', () => {
      const littleEndianView = new SimpleDataView(1024, true);
      const bigEndianView = new SimpleDataView(1024, false);

      littleEndianView.writeInt16(-1000);
      bigEndianView.writeInt16(-1000);

      littleEndianView.moveTo(0);
      bigEndianView.moveTo(0);

      expect(littleEndianView.readInt16()).toBe(-1000);
      expect(bigEndianView.readInt16()).toBe(-1000);
    });
  });

  describe('getInt32 method', () => {
    it('should read positive int32 value and advance offset', () => {
      const dataView = new SimpleDataView();
      dataView.writeInt32(2147483647);
      dataView.writeInt32(100000);
      dataView.moveTo(0);

      const firstValue = dataView.readInt32();
      const secondValue = dataView.readInt32();

      expect(firstValue).toBe(2147483647);
      expect(secondValue).toBe(100000);
    });

    it('should read negative int32 value correctly', () => {
      const dataView = new SimpleDataView();
      dataView.writeInt32(-2147483648);
      dataView.writeInt32(-100000);
      dataView.moveTo(0);

      const firstValue = dataView.readInt32();
      const secondValue = dataView.readInt32();

      expect(firstValue).toBe(-2147483648);
      expect(secondValue).toBe(-100000);
    });

    it('should read int32 values with correct endianness', () => {
      const littleEndianView = new SimpleDataView(1024, true);
      const bigEndianView = new SimpleDataView(1024, false);

      littleEndianView.writeInt32(-100000);
      bigEndianView.writeInt32(-100000);

      littleEndianView.moveTo(0);
      bigEndianView.moveTo(0);

      expect(littleEndianView.readInt32()).toBe(-100000);
      expect(bigEndianView.readInt32()).toBe(-100000);
    });
  });

  describe('getFloat32 method', () => {
    it('should read float32 value and advance offset', () => {
      const dataView = new SimpleDataView();
      dataView.writeFloat32(Math.PI);
      dataView.writeFloat32(1.5);
      dataView.moveTo(0);

      const firstValue = dataView.readFloat32();
      const secondValue = dataView.readFloat32();

      expect(firstValue).toBeCloseTo(Math.PI, 5);
      expect(secondValue).toBeCloseTo(1.5, 5);
    });

    it('should read negative float32 values', () => {
      const dataView = new SimpleDataView();
      dataView.writeFloat32(-2.7);
      dataView.writeFloat32(-0.5);
      dataView.moveTo(0);

      const firstValue = dataView.readFloat32();
      const secondValue = dataView.readFloat32();

      expect(firstValue).toBeCloseTo(-2.7, 5);
      expect(secondValue).toBeCloseTo(-0.5, 5);
    });

    it('should handle special float32 values', () => {
      const dataView = new SimpleDataView();
      dataView.writeFloat32(Number.POSITIVE_INFINITY);
      dataView.writeFloat32(Number.NEGATIVE_INFINITY);
      dataView.writeFloat32(Number.NaN);
      dataView.writeFloat32(0);
      dataView.writeFloat32(-0);
      dataView.moveTo(0);

      expect(dataView.readFloat32()).toBe(Number.POSITIVE_INFINITY);
      expect(dataView.readFloat32()).toBe(Number.NEGATIVE_INFINITY);
      expect(dataView.readFloat32()).toBe(Number.NaN);
      expect(dataView.readFloat32()).toBe(0);
      expect(dataView.readFloat32()).toBe(-0);
    });

    it('should read float32 values with correct endianness', () => {
      const littleEndianView = new SimpleDataView(1024, true);
      const bigEndianView = new SimpleDataView(1024, false);

      littleEndianView.writeFloat32(Math.PI);
      bigEndianView.writeFloat32(Math.PI);

      littleEndianView.moveTo(0);
      bigEndianView.moveTo(0);

      expect(littleEndianView.readFloat32()).toBeCloseTo(Math.PI, 5);
      expect(bigEndianView.readFloat32()).toBeCloseTo(Math.PI, 5);
    });
  });

  describe('getFloat64 method', () => {
    it('should read float64 value and advance offset', () => {
      const dataView = new SimpleDataView();
      dataView.writeFloat64(Math.PI);
      dataView.writeFloat64(1.23456789);
      dataView.moveTo(0);

      const firstValue = dataView.readFloat64();
      const secondValue = dataView.readFloat64();

      expect(firstValue).toBeCloseTo(Math.PI, 10);
      expect(secondValue).toBeCloseTo(1.23456789, 10);
    });

    it('should read negative float64 values', () => {
      const dataView = new SimpleDataView();
      dataView.writeFloat64(-9.87654321);
      dataView.writeFloat64(-0.123);
      dataView.moveTo(0);

      const firstValue = dataView.readFloat64();
      const secondValue = dataView.readFloat64();

      expect(firstValue).toBeCloseTo(-9.87654321, 10);
      expect(secondValue).toBeCloseTo(-0.123, 10);
    });

    it('should handle special float64 values', () => {
      const dataView = new SimpleDataView();
      dataView.writeFloat64(Number.POSITIVE_INFINITY);
      dataView.writeFloat64(Number.NEGATIVE_INFINITY);
      dataView.writeFloat64(Number.NaN);
      dataView.writeFloat64(Number.MAX_VALUE);
      dataView.writeFloat64(Number.MIN_VALUE);
      dataView.moveTo(0);

      expect(dataView.readFloat64()).toBe(Number.POSITIVE_INFINITY);
      expect(dataView.readFloat64()).toBe(Number.NEGATIVE_INFINITY);
      expect(dataView.readFloat64()).toBe(Number.NaN);
      expect(dataView.readFloat64()).toBe(Number.MAX_VALUE);
      expect(dataView.readFloat64()).toBe(Number.MIN_VALUE);
    });

    it('should read float64 values with correct endianness', () => {
      const littleEndianView = new SimpleDataView(1024, true);
      const bigEndianView = new SimpleDataView(1024, false);

      littleEndianView.writeFloat64(Math.E);
      bigEndianView.writeFloat64(Math.E);

      littleEndianView.moveTo(0);
      bigEndianView.moveTo(0);

      expect(littleEndianView.readFloat64()).toBeCloseTo(Math.E, 10);
      expect(bigEndianView.readFloat64()).toBeCloseTo(Math.E, 10);
    });
  });

  describe('endianness consistency', () => {
    it('should use consistent endianness across all write methods', () => {
      const bigEndianView = new SimpleDataView(1024, false);

      bigEndianView.writeUint16(0x1234);
      bigEndianView.writeUint32(0x12345678);
      bigEndianView.writeInt16(-1000);
      bigEndianView.writeInt32(-100000);
      bigEndianView.writeFloat32(Math.PI);
      bigEndianView.writeFloat64(Math.E);

      const buffer = bigEndianView.buffer;
      const view = new DataView(buffer);

      expect(view.getUint16(0, false)).toBe(0x1234);
      expect(view.getUint32(2, false)).toBe(0x12345678);
      expect(view.getInt16(6, false)).toBe(-1000);
      expect(view.getInt32(8, false)).toBe(-100000);
      expect(view.getFloat32(12, false)).toBeCloseTo(Math.PI, 5);
      expect(view.getFloat64(16, false)).toBeCloseTo(Math.E, 10);
    });
  });

  describe('overflow handling', () => {
    it('should throw error when buffer overflows without handler', () => {
      const dataView = new SimpleDataView(4);
      dataView.writeUint32(42); // Uses exactly 4 bytes

      expect(() => dataView.writeUint8(1)).toThrow('Buffer overflowed');
    });
    it('should call overflow handler when buffer overflows', () => {
      const overflowHandler = vi.fn();
      const dataView = new SimpleDataView(4, true, overflowHandler);

      dataView.writeUint32(42); // Uses exactly 4 bytes
      dataView.writeUint8(1); // Should trigger overflow

      expect(overflowHandler).toHaveBeenCalledTimes(1);
      expect(overflowHandler).toHaveBeenCalledWith(expect.any(ArrayBuffer));
    });

    it('should reset buffer after overflow with handler', () => {
      const overflowHandler = vi.fn();
      const dataView = new SimpleDataView(4, true, overflowHandler);

      dataView.writeUint32(42);
      const firstBuffer = dataView.buffer;

      dataView.writeUint8(1); // Trigger overflow

      // Buffer should be reset
      expect(dataView.buffer.byteLength).toBe(1); // Only the new uint8
      expect(dataView.fullBuffer.byteLength).toBe(4); // Still same max size

      // Overflow handler should receive the filled buffer
      expect(overflowHandler).toHaveBeenCalledWith(firstBuffer);
    });

    it('should continue writing after overflow with handler', () => {
      const overflowHandler = vi.fn();
      const dataView = new SimpleDataView(5, true, overflowHandler);

      dataView.writeUint32(42); // 4 bytes
      dataView.writeUint16(100); // Trigger overflow (needs 2 bytes, only 1 available)

      // Should be able to continue writing
      dataView.writeUint8(50);

      const buffer = dataView.buffer;
      const view = new DataView(buffer);
      expect(view.getUint16(0, true)).toBe(100);
      expect(view.getUint8(2)).toBe(50);
      expect(buffer.byteLength).toBe(3);
    });
  });

  describe('mixed data types', () => {
    it('should write different data types in sequence', () => {
      const dataView = new SimpleDataView();

      dataView.writeUint8(255);
      dataView.writeInt8(-10);
      dataView.writeUint16(1000);
      dataView.writeInt16(-500);
      dataView.writeUint32(100000);
      dataView.writeInt32(-50000);

      const buffer = dataView.buffer;
      const view = new DataView(buffer);

      expect(view.getUint8(0)).toBe(255);
      expect(view.getInt8(1)).toBe(-10);
      expect(view.getUint16(2, true)).toBe(1000);
      expect(view.getInt16(4, true)).toBe(-500);
      expect(view.getUint32(6, true)).toBe(100000);
      expect(view.getInt32(10, true)).toBe(-50000);
      expect(buffer.byteLength).toBe(14); // 1+1+2+2+4+4
    });

    it('should read and write different data types in sequence', () => {
      const dataView = new SimpleDataView();

      // Write data
      dataView.writeUint8(255);
      dataView.writeInt8(-10);
      dataView.writeUint16(1000);
      dataView.writeInt16(-500);
      dataView.writeUint32(100000);
      dataView.writeInt32(-50000);
      dataView.writeFloat32(Math.PI);
      dataView.writeFloat64(Math.E);

      // Reset to beginning and read back
      dataView.moveTo(0);

      expect(dataView.readUint8()).toBe(255);
      expect(dataView.readInt8()).toBe(-10);
      expect(dataView.readUint16()).toBe(1000);
      expect(dataView.readInt16()).toBe(-500);
      expect(dataView.readUint32()).toBe(100000);
      expect(dataView.readInt32()).toBe(-50000);
      expect(dataView.readFloat32()).toBeCloseTo(Math.PI, 5);
      expect(dataView.readFloat64()).toBeCloseTo(Math.E, 10);
    });
  });

  describe('get methods overflow handling', () => {
    it('should call overflow handler when reading beyond buffer capacity', () => {
      const overflowHandler = vi.fn();
      const dataView = new SimpleDataView(8, true, overflowHandler);

      // Fill buffer exactly
      dataView.writeUint32(42);
      dataView.writeUint32(100);

      // Reset and read part of the data
      dataView.moveTo(0);
      dataView.readUint32(); // Read first uint32

      // This should trigger overflow when trying to read uint32 but only 4 bytes left, then reading 4 more
      dataView.readUint32(); // This should work fine
      dataView.readUint8(); // This should trigger overflow

      expect(overflowHandler).toHaveBeenCalledTimes(1);
    });

    it('should throw error when reading beyond buffer without overflow handler', () => {
      const dataView = new SimpleDataView(6);
      dataView.writeUint32(42);
      dataView.writeUint16(100);

      dataView.moveTo(0);
      dataView.readUint32(); // Read 4 bytes
      dataView.readUint16(); // Read 2 bytes - buffer is now exhausted

      // This should throw an error
      expect(() => dataView.readUint8()).toThrow('Buffer overflowed');
    });

    it('should handle partial reads correctly with different data types', () => {
      const dataView = new SimpleDataView(7);
      dataView.writeUint32(42);
      dataView.writeUint16(100);
      dataView.writeUint8(50);

      dataView.moveTo(4); // Position after uint32
      expect(dataView.readUint16()).toBe(100);
      expect(dataView.readUint8()).toBe(50);

      // Buffer should be exhausted now
      expect(() => dataView.readUint8()).toThrow('Buffer overflowed');
    });
  });
});
