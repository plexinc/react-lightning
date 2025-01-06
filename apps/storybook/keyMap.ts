import { Keys } from '@plex/react-lightning';

const keyMap = {
  37: Keys.Left,
  38: Keys.Up,
  39: Keys.Right,
  40: Keys.Down,

  8: Keys.Back, // Backspace
  27: Keys.Back, // Esc
  13: Keys.Enter, // Enter

  72: Keys.Home, // h

  32: Keys.PlayPause, // Space
  79: Keys.Pause, // o
  80: Keys.Play, // p
  83: Keys.Stop, // s

  33: [Keys.PageUp, Keys.StepForward], // PageUp
  34: [Keys.PageDown, Keys.StepBack], // PageDown

  48: Keys.Num0,
  49: Keys.Num1,
  50: Keys.Num2,
  51: Keys.Num3,
  52: Keys.Num4,
  53: Keys.Num5,
  54: Keys.Num6,
  55: Keys.Num7,
  56: Keys.Num8,
  57: Keys.Num9,
  73: Keys.Info, // i

  190: Keys.Period,

  219: [Keys.Rewind, Keys.PreviousTab], // [
  221: [Keys.FastForward, Keys.NextTab], // ]

  187: Keys.VolumeUp, // =
  107: Keys.VolumeUp, // Numpad +
  189: Keys.VolumeDown, // -
  109: Keys.VolumeDown, // Numpad -
};

export { keyMap };
