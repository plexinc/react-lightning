import { createContext } from 'react';
import type { Keys } from './Keys';

export type KeyMap = Record<number, Keys | Keys[]>;

const KeyMapContext = createContext<KeyMap>({});

export { KeyMapContext };
