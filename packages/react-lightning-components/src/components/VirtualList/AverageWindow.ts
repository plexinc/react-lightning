export class AverageWindow {
  private _values: number[];
  private _head = 0;
  private _count = 0;
  private _size: number;
  private _sum = 0;

  constructor(size = 10) {
    this._size = Math.max(1, size);
    this._values = Array.from<number>({ length: this._size }).fill(0);
  }

  get currentValue(): number {
    if (this._count === 0) {
      return 0;
    }

    return this._sum / this._count;
  }

  get count(): number {
    return this._count;
  }

  addValue(value: number): void {
    if (this._count >= this._size) {
      this._sum -= this._values[this._head] ?? 0;
      this._values[this._head] = value;
      this._head = (this._head + 1) % this._size;
    } else {
      this._values[(this._head + this._count) % this._size] = value;
      this._count++;
    }

    this._sum += value;
  }

  clear(): void {
    this._head = 0;
    this._count = 0;
    this._sum = 0;
  }
}
