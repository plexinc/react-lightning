import type { FC } from 'react';
import { CanvasBridge } from './CanvasBridge';
import type { CanvasProps } from './CanvasProps';
import { CanvasRoot } from './CanvasRoot';

export const Canvas: FC<CanvasProps> = ({ options, ...props }) => {
  return (
    <CanvasBridge options={options}>
      <CanvasRoot
        {...props}
        width={options.appWidth}
        height={options.appHeight}
      />
    </CanvasBridge>
  );
};
