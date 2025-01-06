import type { LightningElementStyle } from '@plex/react-lightning';
import type { DefaultStyle } from 'react-native-reanimated/lib/typescript/hook/commonTypes';

export function getTransitionProperty<K extends keyof DefaultStyle>(
  prop: K,
): keyof LightningElementStyle {
  switch (prop) {
    case 'backgroundColor':
      return 'color';
    case 'opacity':
      return 'alpha';
    case 'left':
      return 'x';
    case 'top':
      return 'y';
    default:
      return prop as keyof LightningElementStyle;
  }
}
