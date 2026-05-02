import {
  createContext,
  forwardRef,
  type ForwardRefExoticComponent,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
  useContext,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react';

import type { LightningElement, LightningViewElementStyle } from '@plextv/react-lightning';

import { getFlexboxManager } from './manager';

const FlexContext = createContext<boolean>(false);

/**
 * Returns true when the calling component is inside a {@link FlexRoot}
 * subtree (and not below a nested {@link FlexBoundary}). Components like
 * `VirtualList` use this to decide whether to expose flex layout to the
 * content they render.
 */
export function useIsInFlex(): boolean {
  return useContext(FlexContext);
}

export interface FlexBoundaryProps {
  children: ReactNode;
  style?: LightningViewElementStyle | null;
  onResize?: (event: { w: number; h: number }) => void;
}

/**
 * Disables flex layout for everything rendered below it. The wrapper itself
 * still participates in any outer flex tree (so it can be sized), but its
 * descendants are detached from yoga until a nested {@link FlexRoot} re-opts
 * them back in.
 */
export function FlexBoundary({ children, style, onResize }: FlexBoundaryProps): ReactElement {
  const ref = useRef<LightningElement>(null);

  useLayoutEffect(() => {
    const manager = getFlexboxManager();
    const element = ref.current;

    if (!manager || !element) {
      return;
    }

    return manager.markBoundary(element);
  }, []);

  return (
    <lng-view ref={ref} style={style} onResize={onResize}>
      <FlexContext.Provider value={false}>{children}</FlexContext.Provider>
    </lng-view>
  );
}

export interface FlexRootProps {
  children: ReactNode;
  style?: LightningViewElementStyle | null;
  onResize?: (event: { w: number; h: number }) => void;
}

/**
 * Opts a subtree into flex layout by becoming an independent yoga root. Flex
 * is opt-in for this plugin — without an ancestor `FlexRoot` somewhere above,
 * elements get no flex behavior. Wrap your app's root (or any subtree that
 * should use flexbox) with this component.
 */
export const FlexRoot: ForwardRefExoticComponent<FlexRootProps & RefAttributes<LightningElement>> =
  forwardRef<LightningElement, FlexRootProps>(({ children, style, onResize }, forwardedRef) => {
    const ref = useRef<LightningElement>(null);

    useImperativeHandle(forwardedRef, () => ref.current as LightningElement, []);

    useLayoutEffect(() => {
      const manager = getFlexboxManager();
      const element = ref.current;

      if (!manager || !element) {
        return;
      }

      return manager.markFlexRoot(element);
    }, []);

    return (
      <lng-view ref={ref} style={style} onResize={onResize}>
        <FlexContext.Provider value={true}>{children}</FlexContext.Provider>
      </lng-view>
    );
  });

FlexRoot.displayName = 'FlexRoot';
