import { createContext } from 'react';

export const LightningCanvasContext = createContext<HTMLCanvasElement | null>(
  null,
);
