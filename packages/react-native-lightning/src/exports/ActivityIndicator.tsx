import type { LightningViewElement } from '@plextv/react-lightning';
import { htmlColorToLightningColor } from '@plextv/react-lightning-plugin-css-transform';
import { forwardRef, useEffect, useState } from 'react';
import type {
  ForwardRefExoticComponent,
  RefAttributes,
  // useCallback,
} from 'react';
import type { ActivityIndicatorProps as RNActivityIndicatorProps } from 'react-native';
import activityImage from '../../assets/activity.png';

export type ActivityIndicatorProps = RNActivityIndicatorProps &
  RefAttributes<LightningViewElement>;

export const ActivityIndicator: ForwardRefExoticComponent<ActivityIndicatorProps> =
  forwardRef<LightningViewElement, ActivityIndicatorProps>(
    ({ color, size }, ref) => {
      const duration = 1200;
      const [rotation, setRotation] = useState(0);
      const actualColor = htmlColorToLightningColor(
        (color as string) || 'lightblue',
      );

      let actualSize = 30;

      if (typeof size === 'number') {
        actualSize = size;
      } else if (size === 'large') {
        actualSize = 80;
      }

      useEffect(() => {
        setRotation(Math.PI * 2);
      });

      return (
        <lng-view
          ref={ref}
          style={{
            width: actualSize,
            height: actualSize,
            display: 'flex' as const,
            justifyContent: 'center' as const,
            alignItems: 'center' as const,
            rotation,
          }}
          transition={{
            rotation: { duration, loop: true },
          }}
        >
          <lng-image
            src={activityImage}
            style={{
              color: actualColor,
              width: actualSize,
              height: actualSize,
            }}
          />
        </lng-view>
      );
    },
  );
ActivityIndicator.displayName = 'ActivityIndicator';
