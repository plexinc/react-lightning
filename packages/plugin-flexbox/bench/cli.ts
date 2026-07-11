import { main } from './run';

// tsx entry (kept out of run.ts so the vitest gate can import it without
// tripping the transform target's no-top-level-await rule).
await main();
