import type { StandardProperties as CSSProperties } from 'csstype';
import type { ImageStyle, StyleProp, TextStyle, ViewStyle } from 'react-native';

import type {
  LightningImageElementStyle,
  LightningTextElementStyle,
  LightningViewElementStyle,
} from '@plextv/react-lightning';

export type AllStyles = Partial<
  ViewStyle &
    TextStyle &
    ImageStyle &
    CSSProperties &
    LightningViewElementStyle &
    LightningTextElementStyle &
    LightningImageElementStyle
>;

export type AllStyleProps =
  | StyleProp<ViewStyle>
  | StyleProp<ImageStyle>
  | StyleProp<TextStyle>
  | StyleProp<CSSProperties>
  | StyleProp<LightningViewElementStyle>
  | StyleProp<LightningTextElementStyle>
  | StyleProp<LightningImageElementStyle>;
