import type { INodeProps } from '@lightningjs/renderer';
import type { LightningElement, RendererNode } from '@plextv/react-lightning';

export type RendererNodeWithCore = RendererNode<LightningElement> & {
  coreNode: {
    props: INodeProps;
  };
};
