import { CanvasBridge } from './CanvasBridge';
import type { CanvasProps } from './CanvasProps';
import { CanvasRoot } from './CanvasRoot';

export const Canvas = ({ options, ...props }: CanvasProps) => {
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
