import {
  type CSSProperties,
  Children,
  type FC,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from 'react';
import { useMouseHoverHandler } from '../hooks/useMouseHoverHandler';
import { useTheme } from '../hooks/useTheme';

interface Props {
  id?: number | string;
  label: string;
  subLabel?: string;
  subLabelAlwaysVisible?: boolean;
  isSelected?: boolean;
  isClosed?: boolean;
  isFocused?: boolean;
  isFocusable?: boolean;
  isLeaf?: boolean;
  style?: CSSProperties;
  tooltip?: ReactNode;
  onMouseOver?: () => void;
  onMouseOut?: () => void;
  onSelect?: () => void;
  onToggle?: () => void;
}

export const TreeNode: FC<Props> = ({
  id,
  label,
  subLabel,
  subLabelAlwaysVisible,
  isSelected,
  isFocused,
  isFocusable,
  isClosed,
  isLeaf,
  style,
  tooltip,
  onMouseOver,
  onMouseOut,
  onSelect,
  onToggle,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const { isHovered, handleMouseEnter, handleMouseLeave } =
    useMouseHoverHandler();
  const [isContainerHover, setIsContainerHover] = useState(false);
  const theme = useTheme();

  const handleToggle = useCallback(() => {
    onToggle?.();
  }, [onToggle]);

  const handleMouseOver = useCallback(() => {
    handleMouseEnter();
    onMouseOver?.();
  }, [handleMouseEnter, onMouseOver]);

  const handleMouseOut = useCallback(() => {
    handleMouseLeave();
    onMouseOut?.();
  }, [handleMouseLeave, onMouseOut]);

  const handleClick = useCallback(() => {
    onSelect?.();
  }, [onSelect]);

  return (
    <div
      id={id ? `node-id-${id}` : undefined}
      onMouseOver={() => setIsContainerHover(true)}
      onMouseOut={() => setIsContainerHover(false)}
      style={{
        position: 'relative',
        height: '100%',
        zIndex: isContainerHover ? 3 : 1,
        background: isSelected
          ? theme.accent
          : isHovered
            ? theme.secondary
            : theme.transparent,
        color: isSelected || isHovered ? theme.colorInverse : theme.color,
        ...style,
      }}
    >
      <div
        ref={contentRef}
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
        style={{
          display: 'inline-flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '8px',
          height: '100%',
          cursor: 'pointer',
          textWrap: 'nowrap',
          borderRadius: '8px',
          padding: '0 8px',
          opacity: isFocusable ? 1 : 0.4,
          background: isFocused ? theme.highlight : 'transparent',
          color: isFocused ? theme.colorInverse : 'inherit',
        }}
      >
        <span
          onClick={handleToggle}
          style={{
            flex: '0 0 8px',
            width: '8px',
            fontFamily: 'monospace',
            fontSize: '1rem',
            fontWeight: 'bold',
            textAlign: 'right',
          }}
        >
          {isLeaf ? '' : isClosed ? '+' : '-'}
        </span>

        <span style={{ flex: '0 0 auto' }} onClick={handleClick}>
          {label}
        </span>

        {isHovered || subLabelAlwaysVisible ? (
          <small
            style={{
              flex: '0 0 auto',
            }}
          >
            {subLabel}
          </small>
        ) : null}
      </div>

      {isHovered && tooltip ? (
        <div
          style={{
            position: 'absolute',
            background: theme.backgroundColorInverse,
            borderRadius: '4px',
            color: theme.colorInverse,
            fontSize: '.8em',
            boxShadow: '4px 4px 4px rgba(0, 0, 0, .4)',
            top: '20px',
            left: '10%',
            zIndex: 999,
            pointerEvents: 'none',
            padding: '4px',
          }}
        >
          {tooltip}
        </div>
      ) : null}
    </div>
  );
};
