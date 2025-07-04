// A DataView wrapper to automatically handle byte offsets when reading/writing and automatically handle batching when a buffer is full.

export class SimpleDataView {
  private _buffer: ArrayBuffer;
  private _view: DataView;
  private _offset: number;
  private _maxSize: number;
  private _littleEndian: boolean;
  private _overflowHandler?: (filledBuffer: ArrayBuffer) => void;

  constructor(
    maxSize?: number,
    littleEndian?: boolean,
    overflowHandler?: (filledBuffer: ArrayBuffer) => void,
  );
  constructor(
    buffer: ArrayBuffer,
    littleEndian?: boolean,
    overflowHandler?: (filledBuffer: ArrayBuffer) => void,
  );
  constructor(
    maxSizeOrBuffer: number | ArrayBuffer = 1024 * 1000,
    littleEndian = true,
    overflowHandler?: (filledBuffer: ArrayBuffer) => void,
  ) {
    this._buffer =
      typeof maxSizeOrBuffer === 'number'
        ? new ArrayBuffer(maxSizeOrBuffer)
        : maxSizeOrBuffer;
    this._view = new DataView(this._buffer);
    this._offset = 0;
    this._maxSize =
      typeof maxSizeOrBuffer === 'number'
        ? maxSizeOrBuffer
        : this._buffer.byteLength;
    this._littleEndian = littleEndian;
    this._overflowHandler = overflowHandler;
  }

  get buffer() {
    return this._buffer.slice(0, this._offset);
  }

  get fullBuffer() {
    return this._buffer;
  }

  get dataView() {
    return this._view;
  }

  get offset() {
    return this._offset;
  }

  public reset() {
    this._buffer = new ArrayBuffer(this._maxSize);
    this._view = new DataView(this._buffer);
    this._offset = 0;
  }

  public hasSpace(size: number): boolean {
    const newOffset = this._offset + size;

    return newOffset <= this._maxSize && newOffset >= 0;
  }

  // Shifts the offset back by the specified size.
  public shift(size: number) {
    if (this._offset < size) {
      throw new Error('Cannot shift more than current offset');
    }

    this._offset -= size;
  }

  public moveTo(offset: number) {
    if (offset < 0 || offset >= this._maxSize) {
      throw new Error('Offset out of bounds');
    }

    this._offset = offset;
  }

  public moveBy(delta: number) {
    if (!this.hasSpace(delta)) {
      throw new Error('Offset out of bounds');
    }

    this._offset += delta;
  }

  public readUint8 = () => this._readInt(1, true);
  public readUint8At = (offset: number) => this._readIntAt(offset, 1, true);
  public readInt8 = () => this._readInt(1, false);
  public readInt8At = (offset: number) => this._readIntAt(offset, 1, false);
  public writeUint8 = (value: number) => this._writeInt(1, value, true);
  public writeUint8At = (offset: number, value: number) =>
    this._writeIntAt(offset, value, 1, true);
  public writeInt8 = (value: number) => this._writeInt(1, value, false);
  public writeInt8At = (offset: number, value: number) =>
    this._writeIntAt(offset, value, 1, false);

  public readUint16 = () => this._readInt(2, true);
  public readUint16At = (offset: number) => this._readIntAt(offset, 2, true);
  public readInt16 = () => this._readInt(2, false);
  public readInt16At = (offset: number) => this._readIntAt(offset, 2, false);
  public writeUint16 = (value: number) => this._writeInt(2, value, true);
  public writeUint16At = (offset: number, value: number) =>
    this._writeIntAt(offset, value, 2, true);
  public writeInt16 = (value: number) => this._writeInt(2, value, false);
  public writeInt16At = (offset: number, value: number) =>
    this._writeIntAt(offset, value, 2, false);

  public readUint32 = () => this._readInt(4, true);
  public readUint32At = (offset: number) => this._readIntAt(offset, 4, true);
  public readInt32 = () => this._readInt(4, false);
  public readInt32At = (offset: number) => this._readIntAt(offset, 4, false);
  public writeUint32 = (value: number) => this._writeInt(4, value, true);
  public writeUint32At = (offset: number, value: number) =>
    this._writeIntAt(offset, value, 4, true);
  public writeInt32 = (value: number) => this._writeInt(4, value, false);
  public writeInt32At = (offset: number, value: number) =>
    this._writeIntAt(offset, value, 4, false);

  public readBigUint64 = () => this._readInt(8, true);
  public readBigUint64At = (offset: number) => this._readIntAt(offset, 8, true);
  public readBigInt64 = () => this._readInt(8, false);
  public readBigInt64At = (offset: number) => this._readIntAt(offset, 8, false);
  public writeBigUint64 = (value: bigint) => this._writeInt(8, value, true);
  public writeBigUint64At = (offset: number, value: bigint) =>
    this._writeIntAt(offset, value, 8, true);
  public writeBigInt64 = (value: bigint) => this._writeInt(8, value, false);
  public writeBigInt64At = (offset: number, value: bigint) =>
    this._writeIntAt(offset, value, 8, false);

  public readFloat32 = () => this._readFloat(4);
  public readFloat32At = (offset: number) => this._readFloatAt(offset, 4);
  public readFloat64 = () => this._readFloat(8);
  public readFloat64At = (offset: number) => this._readFloatAt(offset, 8);
  public writeFloat32 = (value: number) => this._writeFloat(4, value);
  public writeFloat32At = (offset: number, value: number) =>
    this._writeFloatAt(offset, value, 4);
  public writeFloat64 = (value: number) => this._writeFloat(8, value);
  public writeFloat64At = (offset: number, value: number) =>
    this._writeFloatAt(offset, value, 8);

  private _checkOverflow(size: number) {
    if (this._offset + size > this._maxSize) {
      if (this._overflowHandler) {
        this._overflowHandler(this.buffer);
        this.reset();
      } else {
        throw new Error('Buffer overflowed');
      }
    }
  }

  private _readIntAt(
    offset: number,
    bytes: 1 | 2 | 4,
    unsigned: boolean,
  ): number;
  private _readIntAt(offset: number, bytes: 8, unsigned: boolean): bigint;
  private _readIntAt(
    offset: number,
    bytes: 1 | 2 | 4 | 8,
    unsigned: boolean,
  ): number | bigint;
  private _readIntAt(
    offset: number,
    bytes: 1 | 2 | 4 | 8,
    unsigned: boolean,
  ): number | bigint {
    if (offset < 0 || offset + bytes > this._maxSize) {
      throw new Error('Offset out of bounds');
    }

    switch (bytes) {
      case 1:
        return unsigned
          ? this._view.getUint8(offset)
          : this._view.getInt8(offset);
      case 2:
        return unsigned
          ? this._view.getUint16(offset, this._littleEndian)
          : this._view.getInt16(offset, this._littleEndian);
      case 4:
        return unsigned
          ? this._view.getUint32(offset, this._littleEndian)
          : this._view.getInt32(offset, this._littleEndian);
      case 8:
        return unsigned
          ? this._view.getBigUint64(offset, this._littleEndian)
          : this._view.getBigInt64(offset, this._littleEndian);
      default:
        throw new Error('Size must be 1, 2, 4 or 8 bytes');
    }
  }

  private _readInt(size: 1 | 2 | 4, unsigned: boolean): number;
  private _readInt(size: 8, unsigned: boolean): bigint;
  private _readInt(size: 1 | 2 | 4 | 8, unsigned: boolean): number | bigint {
    this._checkOverflow(size);
    const value = this._readIntAt(this._offset, size, unsigned);
    this._offset += size;
    return value;
  }

  private _writeIntAt(
    offset: number,
    value: bigint,
    size: 8,
    unsigned: boolean,
  ): void;
  private _writeIntAt(
    offset: number,
    value: number,
    size: 1 | 2 | 4,
    unsigned: boolean,
  ): void;
  private _writeIntAt(
    offset: number,
    value: number | bigint,
    size: 1 | 2 | 4 | 8,
    unsigned: boolean,
  ): void;
  private _writeIntAt(
    offset: number,
    value: number | bigint,
    size: 1 | 2 | 4 | 8,
    unsigned: boolean,
  ) {
    if (offset < 0 || offset + size > this._maxSize) {
      throw new Error('Offset out of bounds');
    }

    switch (size) {
      case 1:
        if (unsigned) {
          this._view.setUint8(offset, value as number);
        } else {
          this._view.setInt8(offset, value as number);
        }
        break;
      case 2:
        if (unsigned) {
          this._view.setUint16(offset, value as number, this._littleEndian);
        } else {
          this._view.setInt16(offset, value as number, this._littleEndian);
        }
        break;
      case 4:
        if (unsigned) {
          this._view.setUint32(offset, value as number, this._littleEndian);
        } else {
          this._view.setInt32(offset, value as number, this._littleEndian);
        }
        break;
      case 8:
        if (unsigned) {
          this._view.setBigUint64(offset, value as bigint, this._littleEndian);
        } else {
          this._view.setBigInt64(offset, value as bigint, this._littleEndian);
        }
        break;
      default:
        throw new Error('Size must be 1, 2, 4 or 8 bytes');
    }
  }

  private _writeInt(size: 1 | 2 | 4, value: number, unsigned: boolean): void;
  private _writeInt(size: 8, value: bigint, unsigned: boolean): void;
  private _writeInt(
    size: 1 | 2 | 4 | 8,
    value: number | bigint,
    unsigned: boolean,
  ) {
    this._checkOverflow(size);
    this._writeIntAt(this._offset, value, size, unsigned);
    this._offset += size;
  }

  private _readFloatAt(offset: number, size: 4 | 8): number {
    if (offset < 0 || offset + size > this._maxSize) {
      throw new Error('Offset out of bounds');
    }

    if (size === 4) {
      return this._view.getFloat32(offset, this._littleEndian);
    } else if (size === 8) {
      return this._view.getFloat64(offset, this._littleEndian);
    } else {
      throw new Error('Size must be 4 or 8 bytes');
    }
  }

  private _readFloat(size: 4 | 8): number {
    this._checkOverflow(size);
    const value = this._readFloatAt(this._offset, size);
    this._offset += size;
    return value;
  }

  private _writeFloatAt(offset: number, value: number, size: 4 | 8): void {
    if (offset < 0 || offset + size > this._maxSize) {
      throw new Error('Offset out of bounds');
    }

    if (size === 4) {
      this._view.setFloat32(offset, value, this._littleEndian);
    } else if (size === 8) {
      this._view.setFloat64(offset, value, this._littleEndian);
    } else {
      throw new Error('Size must be 4 or 8 bytes');
    }
  }

  private _writeFloat(size: 4 | 8, value: number): void {
    this._checkOverflow(size);
    this._writeFloatAt(this._offset, value, size);
    this._offset += size;
  }
}
