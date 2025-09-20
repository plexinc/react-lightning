import type {
  KeyEvent,
  LightningElement,
  LightningElementStyle,
  LightningViewElementProps,
} from '@plextv/react-lightning';
import { Keys, useFocus } from '@plextv/react-lightning';
import { useCallback } from 'react';

const containerStyles: LightningElementStyle = {
  w: 330,
  h: 100,
  borderRadius: 15,
  border: { w: 3, color: 0xffffffff },
  display: 'flex' as const,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
};

const textStyle = {
  fontSize: 32,
  lineHeight: containerStyles.h,
  textAlign: 'center' as const,
  color: 0x3e3e3eff,
};

type Props = LightningViewElementProps & {
  autoFocus?: boolean;
  onPress?: () => void;
};

const Button = (props: Props) => {
  const { autoFocus, onPress, ...otherProps } = props;
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

  return (
    <lng-view
      {...otherProps}
      ref={ref}
      onKeyUp={handleKeyUp}
      style={{ ...containerStyles, color }}
    >
      <lng-text style={textStyle}>{props.children}</lng-text>
    </lng-view>
  );
};

Button.displayName = 'Button';

export default Button;
