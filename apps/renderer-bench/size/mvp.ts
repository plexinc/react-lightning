import { createRoot } from '@plextv/react-lightning-renderer/react';

(window as unknown as { x: unknown }).x = createRoot;
