import {
  FocusGroup,
  type LightningViewElement,
  type LightningViewElementProps,
  type LightningViewElementStyle,
} from '@plex/react-lightning';
import { forwardRef } from 'react';

interface Props extends LightningViewElementProps {
  focusable?: boolean;
  focusedStyle?: LightningViewElementStyle;
  autoFocus?: boolean;
  trapFocusUp?: boolean;
  trapFocusRight?: boolean;
  trapFocusDown?: boolean;
  trapFocusLeft?: boolean;
}

export const Column = forwardRef<LightningViewElement, Props>(
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
      flexDirection: 'column',
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
          style={finalStyle}
          focusedStyle={focusedStyle}
        />
      );
    }

    return <lng-view {...otherProps} ref={ref} style={finalStyle} />;
  },
);

Column.displayName = 'Column';
