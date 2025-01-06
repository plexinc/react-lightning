import type { SimpleElement } from './types';

declare module 'webext-bridge' {
  export interface ProtocolMap {
    // window -> devtools
    createElement: SimpleElement;
    addChild: { parent: number; child: number };
    removeChild: number;
    makeFocusable: number;

    elementProps: string;
    elementUpdated: SimpleElement;
    elementRemoved: number;
    replaceElements: Record<number, SimpleElement>;

    setPreviewImage: string | null;
    updateFps: number;

    // devtools -> window
    connected: null;
    disconnected: null;
    requestProps: number;

    setSelectedElement: number | null;
    setHoveredElement: number | null;
  }
}
