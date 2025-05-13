import type {
  FC,
  ForwardRefExoticComponent,
  ForwardRefRenderFunction,
  PropsWithoutRef,
  ReactNode,
  Ref,
  RefAttributes,
} from 'react';
import { forwardRef, memo, useMemo } from 'react';
import { useCombinedRef } from '../hooks/useCombinedRef';
import type { LightningElement } from '../types';
import { type FocusOptions, useFocus } from './useFocus';

type Focusable<P, T> = P &
  RefAttributes<T> &
  FocusOptions & { focused: boolean };

const ForwardRefComponent = forwardRef(() => <div />);

/**
 * Passes a `focused` prop down to the component along with a forwarded ref for
 * attaching a focus hook to. The Component is also automatically memoized and
 * wrapped with another component to prevent unnecessary renders when focus
 * state changes for other components.
 */
export function focusable<P, T extends LightningElement = LightningElement>(
  Component: FC<Focusable<P, T>>,
  componentDisplayName?: string,
  useFocusOptions?: FocusOptions | ((props: Focusable<P, T>) => FocusOptions),
): ForwardRefExoticComponent<P>;
export function focusable<P, T extends LightningElement = LightningElement>(
  Component: (props: Focusable<P, T>, ref: Ref<T>) => ReactNode,
  componentDisplayName?: string,
  useFocusOptions?: FocusOptions | ((props: Focusable<P, T>) => FocusOptions),
): ForwardRefExoticComponent<P>;
export function focusable<P, T extends LightningElement = LightningElement>(
  Component: FC<Focusable<P, T>> | ForwardRefRenderFunction<T, Focusable<P, T>>,
  componentDisplayName?: string,
  useFocusOptions?: FocusOptions | ((props: Focusable<P, T>) => FocusOptions),
) {
  if (!Component.displayName) {
    Component.displayName = componentDisplayName ?? Component.name;
  }

  // Prevent double-wrapping forwardRefs
  const MemoRefComponent = memo(
    isForwardRef(Component)
      ? Component
      : forwardRef<T, Focusable<P, T>>(
          Component as ForwardRefRenderFunction<
            T,
            PropsWithoutRef<Focusable<P, T>>
          >,
        ),
  );

  MemoRefComponent.displayName = `Focusable${Component.displayName}`;

  return forwardRef<T, Focusable<P, T>>((props, forwardedRef) => {
    const focusOptions = useMemo(
      () =>
        typeof useFocusOptions === 'function'
          ? useFocusOptions(props as Focusable<P, T>)
          : useFocusOptions,
      [props, useFocusOptions],
    );
    const { ref, focused } = useFocus(focusOptions);
    const combinedRef = useCombinedRef(ref, forwardedRef);

    return <MemoRefComponent {...props} ref={combinedRef} focused={focused} />;
  });
}

function isForwardRef<T>(
  Component: object,
): Component is ForwardRefExoticComponent<T> {
  return (
    '$$typeof' in Component &&
    Component.$$typeof === ForwardRefComponent.$$typeof
  );
}
