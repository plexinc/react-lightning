import type {
  Dimensions,
  INodeProps,
  ShaderMap,
  TextureMap,
} from '@lightningjs/renderer';
import type { ReactNode, RefAttributes } from 'react';
import type { Animatable } from './Animatable';
import type { EffectsMap } from './Effects';
import type { LightningElement } from './Element';
import type { FocusableProps } from './Focusable';
import type { Rect } from './Geometry';
import type { KeyEvent } from './KeyEvent';
import type {
  LightningImageElementStyle,
  LightningTextElementStyle,
  LightningViewElementStyle,
} from './Styles';

export interface LightningElementEventProps {
  onBeforeLayout?: (rect: Rect) => void;
  onLayout?: (rect: Rect) => void;
  onRender?: () => void;
  onBeforeRender?: () => void;
  onTextureLoaded?: (dimensions: Dimensions) => void;
  onTextureFailed?: (dimensions: Dimensions) => void;
  onKeyDown?: (event: KeyEvent) => boolean | undefined;
  onKeyUp?: (event: KeyEvent) => boolean | undefined;
  onKeyPress?: (event: KeyEvent) => boolean | undefined;
  onLongPress?: (event: KeyEvent) => boolean | undefined;
}

export type ExtractProps<Type> = Type extends {
  z$__type__Props: infer Props;
}
  ? Props
  : never;

export interface ShaderDef<
  shaderType extends keyof ShaderMap = keyof ShaderMap,
> {
  type: shaderType;
  props?: ExtractProps<ShaderMap[shaderType]>;
}

export interface TextureDef<
  textureType extends keyof TextureMap = keyof TextureMap,
> {
  type: textureType;
  props: ExtractProps<TextureMap[textureType]>;
}

export interface LightningViewElementProps<
  TStyleProps extends LightningViewElementStyle = LightningViewElementStyle,
> extends LightningElementEventProps,
    FocusableProps,
    Animatable<TStyleProps & EffectsMap>,
    RefAttributes<LightningElement> {
  effects?: EffectsMap;
  shader?: ShaderDef;
  texture?: TextureDef;
  rtt?: boolean;
  children?: ReactNode | null;
  style?: TStyleProps | null;
}

export type LightningImageElementProps<
  TStyleProps extends LightningImageElementStyle = LightningImageElementStyle,
> = LightningViewElementProps<TStyleProps> & {
  src?: INodeProps['src'];
};

export type LightningTextElementProps<
  TStyleProps extends LightningTextElementStyle = LightningTextElementStyle,
> = LightningViewElementProps<TStyleProps> & {
  text?: string;
};

export type LightningElementProps =
  | LightningImageElementProps
  | LightningTextElementProps
  | LightningViewElementProps;
