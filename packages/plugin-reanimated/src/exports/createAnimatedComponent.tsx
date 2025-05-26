import type {
  LightningElement,
  LightningViewElement,
} from '@plextv/react-lightning';
import { forwardRef, useEffect, useMemo, useRef } from 'react';
import type {
  Falsy,
  RecursiveArray,
  RegisteredStyle,
  ViewProps,
  ViewStyle,
} from 'react-native';
import { isAnimatedStyle } from '../isAnimatedStyle';
import { useMergeRefs } from '../mergeRefs';
import type { AnimatedStyle } from '../types/AnimatedStyle';

function groupStyles(
  styleArray: RecursiveArray<Falsy | ViewStyle | RegisteredStyle<ViewStyle>>,
) {
  return styleArray.reduce<[AnimatedStyle[], Partial<ViewStyle>]>(
    (acc, s) => {
      if (isAnimatedStyle(s)) {
        acc[0].push(s);
      } else if (s != null && s !== false) {
        if (Array.isArray(s)) {
          const [animatedStyles, flatStyles] = groupStyles(s);

          acc[0].push(...animatedStyles);
          Object.assign(acc[1], flatStyles);
        } else {
          Object.assign(acc[1], s);
        }
      }

      return acc;
    },
    [[], {}],
  );
}

function useNormalizedStyles(
  style: RecursiveArray<Falsy | ViewStyle | RegisteredStyle<ViewStyle>>,
) {
  const [animatedStyles, flatStyles] = useMemo(
    () => groupStyles(style),
    [style],
  );
  const ref = useRef<LightningViewElement | null>(null);

  useEffect(() => {
    if (!ref.current || !animatedStyles) {
      return;
    }

    for (const animatedStyle of animatedStyles) {
      if (ref.current) {
        animatedStyle.viewsRef?.add(ref.current);
      }
    }

    return () => {
      for (const animatedStyle of animatedStyles) {
        if (ref.current) {
          animatedStyle.viewsRef?.delete(ref.current);
        }
      }
    };
  }, [animatedStyles]);

  return [flatStyles, ref];
}

export function createAnimatedComponent(Component: JSX.ElementType) {
  return forwardRef<LightningElement, ViewProps>((props, forwardedRef) => {
    const { style, ...otherProps } = props;
    const styleArray = useMemo(
      () => (Array.isArray(style) ? style : [style]),
      [style],
    );
    const [normalizedStyles, ref] = useNormalizedStyles(styleArray);
    const refs = useMergeRefs(forwardedRef, ref);

    return <Component {...otherProps} style={normalizedStyles} ref={refs} />;
  });
}
