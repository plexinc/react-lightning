import { FlatList, Pressable, RefreshControl, ScrollView, Switch, TextInput } from 'react-native';

type Gesture = ((...args: unknown[]) => Gesture) & { [key: PropertyKey]: unknown };

type Passthrough = (props: { children?: unknown }) => unknown;

const passthrough: Passthrough = ({ children }) => children ?? null;

export const GestureDetector: Passthrough = passthrough;
export const GestureHandlerRootView: Passthrough = passthrough;
export const PanGestureHandler: Passthrough = passthrough;
export const TapGestureHandler: Passthrough = passthrough;
export const LongPressGestureHandler: Passthrough = passthrough;
export const RectButton: typeof Pressable = Pressable;
export const BaseButton: typeof Pressable = Pressable;
export const BorderlessButton: typeof Pressable = Pressable;

export const State = {
  UNDETERMINED: 0,
  FAILED: 1,
  BEGAN: 2,
  CANCELLED: 3,
  ACTIVE: 4,
  END: 5,
} as const;

export const Directions = {
  RIGHT: 1,
  LEFT: 2,
  UP: 4,
  DOWN: 8,
  UP_RIGHT: 5,
  DOWN_RIGHT: 9,
  UP_LEFT: 6,
  DOWN_LEFT: 10,
} as const;

export const MouseButton = {
  LEFT: 1,
  RIGHT: 2,
  MIDDLE: 4,
  BUTTON_4: 8,
  BUTTON_5: 16,
  ALL: 31,
} as const;

const makeGesture = (): Gesture =>
  new Proxy(() => {}, {
    get: (_target, prop) =>
      prop === 'toJSON' || prop === Symbol.toPrimitive ? () => undefined : () => makeGesture(),
    apply: () => makeGesture(),
  }) as unknown as Gesture;

export const Gesture: Record<string, () => Gesture> = new Proxy(
  {},
  { get: () => () => makeGesture() },
);

export { FlatList, Pressable, RefreshControl, ScrollView, Switch, TextInput };

const gestureHandler: Record<string, never> = {};

export default gestureHandler;
