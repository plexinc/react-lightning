import type {
  LightningImageElementStyle,
  LightningTextElementStyle,
  LightningViewElementStyle,
} from '@plex/react-lightning';
import type { StandardProperties as CSSProperties } from 'csstype';
import type { ImageStyle, StyleProp, TextStyle, ViewStyle } from 'react-native';

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
