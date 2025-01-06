import type {
  FlexContainer,
  FlexItem,
  FlexLightningBaseElementStyle,
} from './FlexStyles';

declare module '@plex/react-lightning' {
  interface LightningViewElementStyle
    extends FlexLightningBaseElementStyle,
      FlexItem,
      FlexContainer {}

  interface LightningTextElementStyle
    extends FlexLightningBaseElementStyle,
      FlexItem {}

  interface LightningImageElementStyle
    extends FlexLightningBaseElementStyle,
      FlexItem {}
}
