import type { LightningJSXIntrinsicElements } from './Intrinsics';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends LightningJSXIntrinsicElements {}
  }
}
