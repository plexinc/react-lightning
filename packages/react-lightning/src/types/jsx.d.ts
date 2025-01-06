import type { LightningJSXIntrinsicElements } from './Intrinsics';

declare global {
  namespace JSX {
    interface IntrinsicElements extends LightningJSXIntrinsicElements {}
  }
}
