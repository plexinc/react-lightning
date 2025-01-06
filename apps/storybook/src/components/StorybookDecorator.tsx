import { SdfTrFontFace } from '@lightningjs/renderer';
import { Canvas, type RenderOptions } from '@plex/react-lightning';
import flexbox from '@plex/react-lightning-plugin-flexbox';
import { useMemo } from 'react';
import { keyMap } from '../../keyMap';
import { DefaultStoryHeight, DefaultStoryWidth } from '../helpers/constants';

type Props = {
  story: () => JSX.Element;
  canvasOptions?: Partial<RenderOptions>;
};

export function StorybookDecorator({ story: Story, canvasOptions }: Props) {
  const options: RenderOptions = useMemo(
    () => ({
      fpsUpdateInterval: 1000,
      numImageWorkers: 3,
      clearColor: 0x000000d8,
      appWidth: DefaultStoryWidth,
      appHeight: DefaultStoryHeight,
      fonts: (stage) => [
        new SdfTrFontFace('msdf', {
          fontFamily: 'sans-serif',
          descriptors: {},
          atlasUrl: '/fonts/Ubuntu-Regular.msdf.png',
          atlasDataUrl: '/fonts/Ubuntu-Regular.msdf.json',
          stage,
        }),
      ],
      plugins: [flexbox()],
      ...canvasOptions,
    }),
    [canvasOptions],
  );

  return (
    <Canvas keyMap={keyMap} options={options}>
      <Story />
    </Canvas>
  );
}
