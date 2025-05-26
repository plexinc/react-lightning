import type {
  LightningImageElementProps,
  LightningTextElementProps,
  LightningViewElementProps,
} from '@plextv/react-lightning';
import type { AllStyleProps } from './ReactStyle';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'lng-view': LightningViewElementProps & {
        style?: AllStyleProps;
      };
      'lng-image': LightningImageElementProps & {
        style?: AllStyleProps;
      };
      'lng-text': LightningTextElementProps & {
        style?: AllStyleProps;
      };
    }
  }
}
