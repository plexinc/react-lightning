import { useEffect, useRef, useState } from 'react';
import { type LightningRoot, createRoot } from '../../render';
import type { CanvasProps } from './CanvasProps';

export const CanvasBridge = ({
  options,
  children,
}: Pick<CanvasProps, 'options' | 'children'>) => {
  const [root, setRoot] = useState<LightningRoot | undefined>();
  const [initReady, setInitReady] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || initReady) {
      return;
    }
    setInitReady(true);
  }, [initReady]);

  useEffect(() => {
    if (!initReady || !containerRef.current || !options) {
      return;
    }
    createRoot(containerRef.current, { ...options, isPrimaryRenderer: false })
      .then((newRoot) => {
        setRoot(newRoot);
      })
      .catch((error) => {
        console.error(error);
      });
  }, [initReady, options]);

  useEffect(() => {
    root?.render(children);
  }, [root, children]);

  useEffect(() => {
    return () => root?.unmount();
  });

  return <div ref={containerRef} />;
};
