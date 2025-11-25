import { type Context, createContext } from 'react';
import type { Keys } from './Keys';

export type KeyMap = Record<number, Keys | Keys[]>;

const KeyMapContext: Context<KeyMap> = createContext<KeyMap>({});

export { KeyMapContext };
