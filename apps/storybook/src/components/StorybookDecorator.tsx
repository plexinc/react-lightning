import { Canvas, type RenderOptions } from '@plextv/react-lightning';
import { plugin as flexPlugin } from '@plextv/react-lightning-plugin-flexbox';
import { getReactNativePlugins } from '@plextv/react-native-lightning';
import { type JSX, useMemo } from 'react';
import { keyMap } from '../../keyMap';
import { DefaultStoryHeight, DefaultStoryWidth } from '../helpers/constants';

type Props = {
  story: () => JSX.Element;
  tags?: string[];
  canvasOptions?: Partial<RenderOptions>;
};

export function StorybookDecorator({
  story: Story,
  tags,
  canvasOptions,
}: Props) {
  const options: RenderOptions = useMemo(
    () => ({
      fpsUpdateInterval: 1000,
      clearColor: 0x000000d8,
      appWidth: DefaultStoryWidth,
      appHeight: DefaultStoryHeight,
      fonts: [
        {
          type: 'sdf',
          fontFamily: 'sans-serif',
          atlasUrl:
            import.meta.env.BASE_URL +
            'fonts/ChocolateClassicalSans-Regular.msdf.png',
          atlasDataUrl:
            import.meta.env.BASE_URL +
            'fonts/ChocolateClassicalSans-Regular.msdf.json',
        },
      ],
      shaders: [
        'Border',
        'Shadow',
        'Rounded',
        'RoundedWithBorder',
        'RoundedWithShadow',
        'RoundedWithBorderAndShadow',
      ],
      plugins: tags?.includes('reactNative')
        ? getReactNativePlugins([], { flexbox: { useWebWorker: true } })
        : [flexPlugin({ expandToAutoFlexBasis: true, useWebWorker: true })],
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
