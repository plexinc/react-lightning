import type { INodeProps } from '@lightningjs/renderer';
import type { LightningElement, RendererNode } from '@plex/react-lightning';

export type RendererNodeWithCore = RendererNode<LightningElement> & {
  coreNode: {
    props: INodeProps;
  };
};
