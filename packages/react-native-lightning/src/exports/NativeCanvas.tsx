import type { FC } from 'react';

import { Canvas, type CanvasProps } from '@plextv/react-lightning';
import { FlexRoot } from '@plextv/react-lightning-plugin-flexbox';

/**
 * Drop-in replacement for {@link Canvas} that wraps its children in a
 * {@link FlexRoot} sized to the canvas, so React Native components below it
 * lay out via flex without any extra setup. Flex is opt-in for the flexbox
 * plugin — using this canvas is the easiest way to opt the whole app in.
 */
export const NativeCanvas: FC<CanvasProps> = ({ children, options, ...rest }) => {
  return (
    <Canvas options={options} {...rest}>
      <FlexRoot style={{ w: options.appWidth ?? 1920, h: options.appHeight ?? 1080 }}>
        {children}
      </FlexRoot>
    </Canvas>
  );
};
