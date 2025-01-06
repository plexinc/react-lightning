import { type LightningElement, useFocus } from '@plex/react-lightning';

export const FocusableImage = ({
  disable,
  hidden,
  autoFocus,
  trapFocusUp,
  trapFocusRight,
  trapFocusDown,
  trapFocusLeft,
  style,
}: {
  disable?: boolean;
  hidden?: boolean;
  autoFocus?: boolean;
  trapFocusUp?: boolean;
  trapFocusRight?: boolean;
  trapFocusDown?: boolean;
  trapFocusLeft?: boolean;
  style?: LightningElement['style'];
}) => {
  const { focused, ref } = useFocus({
    active: !disable,
    autoFocus,
    trapFocusUp,
    trapFocusRight,
    trapFocusDown,
    trapFocusLeft,
  });

  return (
    <lng-image
      ref={ref}
      src={`https://picsum.photos/${style?.width ?? 100}/${style?.height ?? 150}`}
      style={{
        width: style?.width ?? 100,
        height: style?.height ?? 150,
        borderRadius: 8,
        alpha: disable ? 0.5 : hidden ? 0 : 1,
        scale: focused ? 1.1 : 1,
        border: { width: focused ? 2 : 0, color: 0xffffffff },
        ...style,
      }}
      transition={{
        scale: { duration: 250 },
      }}
    />
  );
};
