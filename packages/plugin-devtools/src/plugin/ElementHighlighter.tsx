import type { LightningElement } from '@plex/react-lightning';
import type { CSSProperties, FC, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../hooks/useTheme';
import { roundTo } from '../utils/roundTo';

interface Props {
  selectedElement: LightningElement | null;
  hoveredElement: LightningElement | null;
  style?: CSSProperties;
}

function boundToRect({
  x1,
  x2,
  y1,
  y2,
}: {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}) {
  return {
    left: x1,
    top: y1,
    width: x2 - x1,
    height: y2 - y1,
  };
}

export const ElementHighlighter: FC<Props> = ({
  selectedElement,
  hoveredElement,
  style,
}) => {
  const theme = useTheme();

  const children: ReactNode[] = [];

  if (selectedElement) {
    if (selectedElement.node.renderBound) {
      children.push(
        <ElementBox
          key="selected-element-render-bounds"
          bounds={boundToRect(selectedElement.node.renderBound)}
          color={theme.accent}
          borderStyle="solid"
          style={style}
        />,
      );
    }

    if (selectedElement.node.strictBound) {
      children.push(
        <ElementBox
          key="selected-element-strict-bounds"
          bounds={boundToRect(selectedElement.node.strictBound)}
          color={theme.red}
          borderStyle="solid"
          style={style}
        />,
      );
    }
  }

  if (hoveredElement && hoveredElement !== selectedElement) {
    if (hoveredElement.node.renderBound) {
      children.push(
        <ElementBox
          key="hovered-element-render-bounds"
          bounds={boundToRect(hoveredElement.node.renderBound)}
          color={theme.secondary}
          borderStyle="dashed"
          style={style}
        />,
      );
    }

    if (hoveredElement.node.strictBound) {
      children.push(
        <ElementBox
          key="hovered-element-strict-bounds"
          bounds={boundToRect(hoveredElement.node.strictBound)}
          color={theme.red}
          borderStyle="dotted"
          style={style}
        />,
      );
    }
  }

  return createPortal(children, document.body);
};

const ElementBox = ({
  bounds: { width, height, top, left },
  color = 'white',
  borderStyle = 'solid',
  style,
}: {
  bounds: { width: number; height: number; top: number; left: number };
  color?: CSSProperties['color'];
  borderStyle?: CSSProperties['borderStyle'];
  style?: CSSProperties;
}) => {
  const roundedWidth = roundTo(width, 2);
  const roundedHeight = roundTo(height, 2);

  return (
    <div
      style={{
        ...style,
        borderWidth: '2px',
        borderColor: color,
        borderStyle,
        boxSizing: 'border-box',
        position: 'fixed',
        pointerEvents: 'none',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: roundedWidth,
        height: roundedHeight,
        left: `${left}px`,
        top: `${top}px`,
      }}
    >
      <span
        style={{
          fontFamily: 'sans-serif',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '8px',
          color: color,
        }}
      >
        {roundedWidth} x {roundedHeight}
      </span>
    </div>
  );
};
