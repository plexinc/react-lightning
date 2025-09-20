import {
  type CoreTextureManager,
  Texture,
  type TextureData,
} from '@lightningjs/renderer';

/**
 * Augment the EffectMap interface to include the CustomEffect
 */
declare module '@lightningjs/renderer' {
  interface TextureMap {
    MyCustomTexture: typeof MyCustomTexture;
  }
}

export interface MyCustomTextureProps {
  percent?: number;
  w: number;
  h: number;
}

export class MyCustomTexture extends Texture {
  static z$__type__Props: MyCustomTextureProps;

  private props: Required<MyCustomTextureProps>;

  constructor(txManager: CoreTextureManager, props: MyCustomTextureProps) {
    super(txManager);
    this.props = MyCustomTexture.resolveDefaults(props);
  }

  override async getTextureSource(): Promise<TextureData> {
    const { percent, w, h } = this.props;
    const radius = Math.min(w, h) / 2;
    const angle = 2 * Math.PI * (percent / 100);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not initialize canvas for texture');
    }
    ctx.beginPath();
    ctx.arc(radius, radius, radius, 0, 2 * Math.PI);
    ctx.fillStyle = 'orange';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(radius, radius);
    ctx.arc(radius, radius, radius, -angle / 2, angle / 2);
    ctx.closePath();
    ctx.fillStyle = 'blue';
    ctx.fill();

    this.setState('fetched', {
      w,
      h,
    });

    return {
      data: ctx.getImageData(0, 0, canvas.width, canvas.height),
    };
  }

  static override makeCacheKey(_props: MyCustomTextureProps): string | false {
    // // Cache by props (only do this if could be helpful, otherwise leave it uncached)
    // const rprops = MyCustomTexture.resolveDefaults(props)
    // return `MyCustomTexture,${rprops.percent},${rprops.width},${rprops.height},`;
    return false; // <-- Don't cache at all
  }

  static override resolveDefaults(
    props: MyCustomTextureProps,
  ): Required<MyCustomTextureProps> {
    return {
      percent: props.percent ?? 20,
      w: props.w,
      h: props.h,
    };
  }
}
