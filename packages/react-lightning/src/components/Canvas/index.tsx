import { useContext } from 'react';
import { LightningRootContext } from '../../render';
import { CanvasBridge } from './CanvasBridge';
import type { CanvasProps } from './CanvasProps';
import { CanvasRoot } from './CanvasRoot';

export const Canvas = ({ options, ...props }: CanvasProps) => {
  const context = useContext(LightningRootContext);

  if (context) {
    return <CanvasRoot {...props} />;
  }

  return (
    <CanvasBridge options={options}>
      <CanvasRoot {...props} />
    </CanvasBridge>
  );
};
