import { createRoot } from '@plextv/react-lightning';

(window as unknown as { x: unknown }).x = createRoot;
