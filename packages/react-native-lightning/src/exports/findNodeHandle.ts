import type { LightningViewElement } from '@plextv/react-lightning';

// RN's findNodeHandle returns an opaque numeric node handle; react-native-web's
// throws. On Lightning the focus APIs (FocusGuide.setDestinations, focus hints)
// operate on element refs directly, so return the ref as-is. Keeps shared code
// that funnels refs through findNodeHandle working instead of crashing.
export function findNodeHandle(
  componentOrHandle: unknown,
): LightningViewElement | null {
  return (componentOrHandle as LightningViewElement | null) ?? null;
}
