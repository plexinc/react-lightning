import type { INode, ITextNode } from '@lightningjs/renderer';
import type { Fiber } from 'react-reconciler';

export type RendererNode<T> = INode & { __reactNode?: T; __reactFiber: Fiber };
export type TextRendererNode<T> = ITextNode & RendererNode<T>;
