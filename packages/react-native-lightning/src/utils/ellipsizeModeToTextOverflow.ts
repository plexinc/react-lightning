import type { TextProps } from 'react-native';
import type { LightningTextElementStyle } from '@plextv/react-lightning';

export function ellipsizeModeToTextOverflow(
  mode: TextProps['ellipsizeMode'],
): LightningTextElementStyle['textOverflow'] {
  if (mode === 'clip') {
    return 'clip';
  }

  // Renderer has no head/middle truncation, so they fall back to tail ellipsis.
  if (mode === 'tail' || mode === 'head' || mode === 'middle') {
    return 'ellipsis';
  }

  return undefined;
}
