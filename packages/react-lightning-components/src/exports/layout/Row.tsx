import {
  FocusGroup,
  type LightningViewElement,
  type LightningViewElementProps,
  type LightningViewElementStyle,
} from '@plextv/react-lightning';
import { forwardRef } from 'react';

export interface RowProps extends LightningViewElementProps {
  focusable?: boolean;
  focusedStyle?: LightningViewElementStyle;
  autoFocus?: boolean;
  trapFocusUp?: boolean;
  trapFocusRight?: boolean;
  trapFocusDown?: boolean;
  trapFocusLeft?: boolean;
}

const Row = forwardRef<LightningViewElement, RowProps>(
  (
    {
      style,
      autoFocus,
      focusable,
      focusedStyle,
      trapFocusUp,
      trapFocusRight,
      trapFocusDown,
      trapFocusLeft,
      ...otherProps
    },
    ref,
  ) => {
    const finalStyle: LightningViewElementStyle = {
      ...style,
      display: 'flex',
      flexDirection: 'row',
    };

    if (focusable) {
      return (
        <FocusGroup
          {...otherProps}
          ref={ref}
          autoFocus={autoFocus}
          trapFocusUp={trapFocusUp}
          trapFocusRight={trapFocusRight}
          trapFocusDown={trapFocusDown}
          trapFocusLeft={trapFocusLeft}
          style={(focused) =>
            focused ? finalStyle : { ...finalStyle, ...focusedStyle }
          }
        />
      );
    }

    return <lng-view {...otherProps} ref={ref} style={finalStyle} />;
  },
);

Row.displayName = 'Row';

export default Row;
