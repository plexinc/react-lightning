import { useMouseHoverHandler } from '../hooks/useMouseHoverHandler';
import { useTheme } from '../hooks/useTheme';

type Props<T> = {
  title: string;
  value: T;
  selected: boolean;
  onClick: (value: T) => void;
};

export function InspectorButton<T>({
  title,
  value,
  selected,
  onClick,
}: Props<T>) {
  const theme = useTheme();
  const {
    isHovered: hovered,
    handleMouseEnter,
    handleMouseLeave,
  } = useMouseHoverHandler();

  const handleClick = () => {
    onClick(value);
  };

  return (
    <button
      id="lightning"
      type="button"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        cursor: 'pointer',
        borderLeft: 0,
        borderTop: 0,
        borderBottom: 0,
        borderRight: `1px solid ${theme.border}`,
        color: selected ? theme.backgroundColorMuted : theme.color,
        backgroundColor: selected
          ? theme.accent
          : hovered
            ? theme.backgroundColorMuted
            : theme.backgroundColor,
      }}
    >
      {title}
    </button>
  );
}
