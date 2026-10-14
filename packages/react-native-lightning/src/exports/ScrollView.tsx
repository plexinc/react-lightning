import {
  type ForwardRefExoticComponent,
  PureComponent,
  type RefAttributes,
  createRef,
  forwardRef,
  useContext,
  useEffect,
  useRef,
} from 'react';
import type {
  NativeScrollEvent,
  ScrollView as RNScrollView,
  ScrollViewProps as RNScrollViewProps,
} from 'react-native';
import type { JSX } from 'react/jsx-runtime';

import {
  FocusManagerContext,
  type LightningElement,
  LightningViewElement,
  type LightningViewElementProps,
  type LightningViewElementStyle,
  useCombinedRef,
} from '@plextv/react-lightning';

import { createHandler } from '../hooks/useFocusHandler';
import type { NativeLightningViewElement } from '../types/NativeLightningViewElement';
import { createNativeSyntheticEvent } from '../utils/createNativeSyntheticEvent';
import { getEnsureVisibleOffset, usesExplicitAlignment } from './scrollFocus';
import { clampScrollOffset, getAxisOffset, isAxisMeasured } from './scrollOffset';
import { View, type ViewProps, defaultViewStyle } from './View';

function isDescendantOf(ancestor: LightningElement, node: LightningElement): boolean {
  let current: LightningElement | null = node.parent;
  while (current) {
    if (current === ancestor) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

export type ScrollViewProps = Omit<RNScrollViewProps, 'style'> &
  Pick<ViewProps, 'style'> & {
    animated?: boolean;
  };

interface ScrollViewState {
  offset: { x: number; y: number };
  animated: boolean;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function getScrollInfo(
  viewport?: Rect,
  container?: Rect,
  child?: Rect | null,
  snapToAlignment?: 'center' | 'end' | 'start' | null,
  horizontal?: boolean | null,
): NativeScrollEvent | null {
  if (!viewport || !container || !child) {
    return null;
  }

  const x = horizontal
    ? getAxisOffset(viewport.w, container.w, child.x, child.w, snapToAlignment ?? 'start')
    : container.x;
  const y = !horizontal
    ? getAxisOffset(viewport.h, container.h, child.y, child.h, snapToAlignment ?? 'start')
    : container.y;

  return {
    contentInset: { top: 0, left: 0, bottom: 0, right: 0 },
    contentOffset: { x, y },
    contentSize: { width: container.w, height: container.h },
    layoutMeasurement: { width: viewport.w, height: viewport.h },
    zoomScale: 1,
  };
}

class ScrollViewBase extends PureComponent<ScrollViewProps, ScrollViewState> {
  private _containerRef = createRef<LightningViewElement>();
  private _animatedTransition = { x: { duration: 200 }, y: { duration: 200 } };
  private _blurSource?: ScrollViewProps['onBlur'];
  private _blurHandler?: ReturnType<typeof createHandler<'blur'>>;
  private _focusSource?: ScrollViewProps['onFocus'];
  private _focusHandler?: ReturnType<typeof createHandler<'focus'>>;
  private _viewportRef = createRef<NativeLightningViewElement>();

  public static displayName = 'LightningScrollView';

  public constructor(props: ScrollViewProps) {
    super(props);

    this.state = {
      offset: props.contentOffset ?? { x: 0, y: 0 },
      animated: props.animated ?? true,
    };
  }

  public scrollTo: RNScrollView['scrollTo'] = (options, deprecatedX) => {
    if (options == null) {
      return;
    }

    let { x, y } = this.state.offset;

    if (typeof options === 'number') {
      // This is actually deprecated but we should still handle it
      y = options;
      x = deprecatedX ?? x;
    } else {
      x = options.x ?? x;
      y = options.y ?? y;
    }

    const newOffset = this._getChildOffset({ x, y, w: 0, h: 0 });

    if (newOffset) {
      this._doScroll(newOffset);
    }
  };

  public scrollToElement = (el: LightningElement): void => {
    const offset = this._getChildOffset(el);

    if (offset && this._isScrollAxisMeasured(offset)) {
      this._doScroll(offset);
    }
  };

  // Reveal a focused descendant the way native TV scroll views do: scroll the
  // minimum needed to bring it fully into view, leaving already-visible items
  // where they are.
  public scrollFocusIntoView = (el: LightningElement): void => {
    const container = this._containerRef.current;
    const viewport = this._viewportRef.current;

    if (
      !(el instanceof LightningViewElement) ||
      !container ||
      !viewport ||
      !isDescendantOf(container, el)
    ) {
      return;
    }

    if (usesExplicitAlignment(this.props.snapToAlignment)) {
      this.scrollToElement(el);
      return;
    }

    const child = el.getBoundingClientRect(container);
    const containerBounds = container.getBoundingClientRect(viewport);
    const viewportBounds = viewport.getBoundingClientRect();
    const { horizontal } = this.props;
    const { x, y } = this.state.offset;

    if (
      horizontal
        ? !isAxisMeasured(viewportBounds.w, containerBounds.w)
        : !isAxisMeasured(viewportBounds.h, containerBounds.h)
    ) {
      return;
    }

    const nextX = horizontal
      ? getEnsureVisibleOffset(
          viewportBounds.w,
          containerBounds.w,
          x,
          child.x,
          child.w,
          child.w / 2,
        )
      : x;
    const nextY = horizontal
      ? y
      : getEnsureVisibleOffset(
          viewportBounds.h,
          containerBounds.h,
          y,
          child.y,
          child.h,
          child.h / 2,
        );

    this._doScroll({
      contentInset: { top: 0, left: 0, bottom: 0, right: 0 },
      contentOffset: { x: nextX, y: nextY },
      contentSize: { width: containerBounds.w, height: containerBounds.h },
      layoutMeasurement: { width: viewportBounds.w, height: viewportBounds.h },
      zoomScale: 1,
    });
  };

  public scrollToEnd: RNScrollView['scrollToEnd'] = () => {
    const containerBounds = this._containerRef.current?.getBoundingClientRect(
      this._viewportRef.current,
    );
    const viewportBounds = this._viewportRef.current?.getBoundingClientRect();

    if (!containerBounds || !viewportBounds) {
      return;
    }

    const { x, y } = this.state.offset;

    this.setState({
      offset: {
        x: this.props.horizontal ? containerBounds.w - viewportBounds.w : x,
        y: this.props.horizontal ? y : containerBounds.h - viewportBounds.h,
      },
    });
  };

  public getScrollableNode(): LightningViewElement<
    LightningViewElementStyle,
    LightningViewElementProps<LightningViewElementStyle>
  > | null {
    return this._viewportRef.current;
  }

  // Undocumented
  public getInnerViewNode(): LightningViewElement<
    LightningViewElementStyle,
    LightningViewElementProps<LightningViewElementStyle>
  > | null {
    return this._containerRef.current;
  }

  // RN parity: the host node `measureLayout` measures against. Returns the inner
  // scrolled content container so child offsets are content-relative (independent
  // of the current scroll offset), matching native ScrollView.getNativeScrollRef.
  public getNativeScrollRef(): LightningViewElement<
    LightningViewElementStyle,
    LightningViewElementProps<LightningViewElementStyle>
  > | null {
    return this._containerRef.current;
  }

  public render(): JSX.Element {
    const { children, style, contentContainerStyle, horizontal, ...props } = this.props;
    const flexDirection = horizontal ? 'row' : 'column';

    return (
      <View
        ref={this._setViewRef}
        style={[
          defaultViewStyle,
          style,
          { overflow: 'hidden', flexDirection, flexGrow: 1, flexShrink: 1 },
        ]}
        {...props}
        onBlur={this._getBlurHandler()}
        onFocus={this._getFocusHandler()}
      >
        <View
          ref={this._containerRef}
          style={[
            defaultViewStyle,
            { display: 'flex', flexDirection },
            contentContainerStyle,
            this.state.offset,
          ]}
          transition={this.state.animated ? this._animatedTransition : undefined}
        >
          {children}
        </View>
      </View>
    );
  }

  private _getBlurHandler() {
    if (!this._blurHandler || this._blurSource !== this.props.onBlur) {
      this._blurSource = this.props.onBlur;
      this._blurHandler = createHandler<'blur'>(this.props.onBlur);
    }

    return this._blurHandler;
  }

  private _getFocusHandler() {
    if (!this._focusHandler || this._focusSource !== this.props.onFocus) {
      this._focusSource = this.props.onFocus;
      this._focusHandler = createHandler<'focus'>(this.props.onFocus);
    }

    return this._focusHandler;
  }

  private _getChildOffset = (child?: LightningElement | Rect | null) => {
    const isElement = child instanceof LightningViewElement;
    const rect = isElement ? child.getBoundingClientRect(this._containerRef.current) : child;

    return getScrollInfo(
      this._viewportRef.current?.getBoundingClientRect(),
      this._containerRef.current?.getBoundingClientRect(this._viewportRef.current),
      rect,
      // If we're getting offset via a positional value, we make sure we don't
      // use the snapToAlignment to calculate the offset since the offset should
      // already be taken into account.
      // 'item' (paging) has no alignment math, so it falls back to 'start'.
      isElement && usesExplicitAlignment(this.props.snapToAlignment)
        ? this.props.snapToAlignment
        : 'start',
      this.props.horizontal,
    );
  };

  private _setViewRef = (ref: View | null) => {
    this._viewportRef.current = ref ?? null;
  };

  private _isScrollAxisMeasured({ layoutMeasurement, contentSize }: NativeScrollEvent): boolean {
    return this.props.horizontal
      ? isAxisMeasured(layoutMeasurement.width, contentSize.width)
      : isAxisMeasured(layoutMeasurement.height, contentSize.height);
  }

  private _doScroll(newOffset: NativeScrollEvent) {
    const { contentOffset, layoutMeasurement, contentSize } = newOffset;
    const clampedX = clampScrollOffset(contentOffset.x, layoutMeasurement.width, contentSize.width);
    const clampedY = clampScrollOffset(
      contentOffset.y,
      layoutMeasurement.height,
      contentSize.height,
    );

    if (this.state.offset.x !== clampedX || this.state.offset.y !== clampedY) {
      this.setState({ offset: { x: clampedX, y: clampedY } });

      if (this._viewportRef.current) {
        this._viewportRef.current.scrollLeft = -clampedX;
        this._viewportRef.current.scrollTop = -clampedY;
      }

      this.props.onScroll?.(
        createNativeSyntheticEvent({
          ...newOffset,
          contentOffset: {
            x: -clampedX,
            y: -clampedY,
          },
        }),
      );
    }
  }
}

// Wrap the class so it follows focus like a native TV scroll view: when spatial
// nav moves focus to a descendant, scroll it into view. The class stays the ref
// target so imperative callers (scrollTo, scrollToEnd, …) are unaffected.
export const ScrollView: ForwardRefExoticComponent<
  RefAttributes<ScrollViewBase> & ScrollViewProps
> = forwardRef<ScrollViewBase, ScrollViewProps>((props, ref) => {
  const focusManager = useContext(FocusManagerContext)?.focusManager;
  const instanceRef = useRef<ScrollViewBase>(null);
  const combinedRef = useCombinedRef(ref, instanceRef);

  useEffect(() => {
    if (!focusManager) {
      return;
    }

    return focusManager.on('focusPathChanged', (focusPath: LightningElement[]) => {
      const leaf = focusPath[focusPath.length - 1];
      const instance = instanceRef.current;

      if (leaf && instance?.getScrollableNode()?.visible) {
        instance.scrollFocusIntoView(leaf);
      }
    });
  }, [focusManager]);

  return <ScrollViewBase ref={combinedRef} {...props} />;
});

ScrollView.displayName = 'ScrollView';

export type ScrollView = ScrollViewBase;
