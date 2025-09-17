declare module '@repo/vite-config/lib' {
  import type { UserConfigFnObject } from 'vite';

  declare const config: UserConfigFnObject;

  export default config;
}
