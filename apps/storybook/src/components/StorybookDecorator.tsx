import { SdfTrFontFace } from '@lightningjs/renderer';
import { Canvas, type RenderOptions } from '@plextv/react-lightning';
import { plugin as flexPlugin } from '@plextv/react-lightning-plugin-flexbox';
import { getPlugins } from '@plextv/react-native-lightning';
import { useMemo } from 'react';
import { keyMap } from '../../keyMap';
import { DefaultStoryHeight, DefaultStoryWidth } from '../helpers/constants';

type Props = {
  story: () => JSX.Element;
  tags: string[];
  canvasOptions?: Partial<RenderOptions>;
};

export function StorybookDecorator({
  story: Story,
  tags = [],
  canvasOptions,
}: Props) {
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
      plugins: tags.includes('reactNative') ? getPlugins() : [flexPlugin()],
      ...canvasOptions,
    }),
    [tags, canvasOptions],
  );

  return (
    <Canvas keyMap={keyMap} options={options}>
      <Story />
    </Canvas>
  );
}
