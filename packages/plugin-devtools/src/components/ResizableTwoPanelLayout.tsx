import { type MouseEvent, useCallback, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { getStorageKey } from '../utils/getStorageKey';
import { useLocalStorage } from '../utils/useLocalStorage';

type Props = {
  startChild: JSX.Element;
  endChild: JSX.Element;
  startContainerStyle?: React.CSSProperties;
  endContainerStyle?: React.CSSProperties;
  orientation: 'horizontal' | 'vertical';
  defaultStartSize: number;
  minSize?: number;
  maxSize?: number;
  storageKey: string;
};

export const ResizableTwoPanelLayout = ({
  startChild,
  endChild,
  startContainerStyle,
  endContainerStyle,
  orientation,
  defaultStartSize,
  minSize = 20,
  maxSize = 80,
  storageKey,
}: Props) => {
  const [contentSize, setContentSize] = useLocalStorage(
    getStorageKey(storageKey),
    defaultStartSize,
  );
  const [resizing, setResizing] = useState(false);
  const theme = useTheme();

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (resizing) {
        const newSize =
          orientation === 'horizontal'
            ? (e.clientX / window.innerWidth) * 100
            : (e.clientY / window.innerHeight) * 100;

        setContentSize(Math.min(Math.max(newSize, minSize), maxSize));
      }
    },
    [resizing, maxSize, minSize, orientation, setContentSize],
  );

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        flexDirection: orientation === 'horizontal' ? 'row' : 'column',
      }}
      onMouseUp={() => setResizing(false)}
      onMouseMove={handleMouseMove}
    >
      <div
        style={{
          flex: `0 0 ${contentSize}%`,
          overflow: 'hidden',
          [orientation === 'horizontal' ? 'marginRight' : 'marginBottom']:
            `-${theme.dragHandleSize / 2}px`,
          ...startContainerStyle,
        }}
      >
        {startChild}
      </div>

      <div
        style={{
          ...(orientation === 'horizontal'
            ? {
                justifyContent: 'center',
              }
            : {
                alignItems: 'center',
              }),
          display: 'flex',
          flex: `0 0 ${theme.dragHandleSize}px`,
          cursor: orientation === 'horizontal' ? 'ew-resize' : 'ns-resize',
        }}
        onMouseDown={() => setResizing(true)}
      >
        <div
          style={{
            backgroundColor: theme.border,
            zIndex: 10,
            [orientation === 'horizontal' ? 'height' : 'width']: '100%',
            [orientation === 'horizontal' ? 'width' : 'height']: '1px',
          }}
        />
      </div>

      <div
        style={{
          flex: '1 1 auto',
          overflow: 'hidden',
          [orientation === 'horizontal' ? 'marginLeft' : 'marginTop']:
            `-${theme.dragHandleSize / 2}px`,
          ...endContainerStyle,
        }}
      >
        {endChild}
      </div>
    </div>
  );
};
