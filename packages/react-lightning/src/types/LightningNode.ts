import type { INode, ITextNode } from '@lightningjs/renderer';

export type RendererNode<T> = INode & { container: T };
export type TextRendererNode<T> = ITextNode & RendererNode<T>;
