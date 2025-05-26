import type { Node } from 'yoga-layout';
import type {
  FlexContainer,
  FlexItem,
  FlexLightningBaseElementStyle,
} from './FlexStyles';

declare module '@plextv/react-lightning' {
  interface LightningViewElement {
    yogaNode?: Node;
  }

  interface LightningTextElement {
    yogaNode?: Node;
  }

  interface LightningImageElement {
    yogaNode?: Node;
  }

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
