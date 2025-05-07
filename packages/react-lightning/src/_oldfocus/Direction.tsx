export enum Direction {
  Up = 0b0001,
  Right = 0b0010,
  Down = 0b0100,
  Left = 0b1000,
  Vertical = Direction.Up | Direction.Down,
  Horizontal = Direction.Left | Direction.Right,
}
