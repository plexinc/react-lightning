import type {
  KeyEvent,
  LightningElement,
  LightningViewElementProps,
} from '@plex/react-lightning';
import { Keys, useFocus } from '@plex/react-lightning';
import { useCallback } from 'react';

const containerStyles = {
  width: 170,
  height: 75,
  borderRadius: 15,
  display: 'flex' as const,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
};

const textStyle = {
  fontSize: 18,
  lineHeight: containerStyles.height,
  textAlign: 'center' as const,
  color: 0x3e3e3eff,
};

type Props = LightningViewElementProps & {
  autoFocus?: boolean;
  onPress?: () => void;
};

const Button = (props: Props) => {
  const { autoFocus, onPress, style, ...otherProps } = props;
  const { ref, focused } = useFocus<LightningElement>({ autoFocus });

  const handleKeyUp = useCallback(
    (ev: KeyEvent) => {
      if (ev.remoteKey === Keys.Enter) {
        onPress?.();
      }

      return true;
    },
    [onPress],
  );

  const color = focused ? 0xcccc44ff : 0xcccc44aa;
  const border = focused
    ? { width: 3, color: 0xffffffff }
    : { width: 0, color: 0 };

  return (
    <lng-view
      {...otherProps}
      ref={ref}
      onKeyUp={handleKeyUp}
      style={{ ...containerStyles, ...style, border, color }}
    >
      <lng-text style={textStyle}>{props.children}</lng-text>
    </lng-view>
  );
};

Button.displayName = 'Button';

export default Button;
