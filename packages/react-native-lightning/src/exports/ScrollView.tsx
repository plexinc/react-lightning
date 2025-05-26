import {
  type LightningElement,
  LightningViewElement,
  simpleDiff,
} from '@plextv/react-lightning';
import { Component, createRef } from 'react';
import type {
  NativeScrollEvent,
  ScrollView as RNScrollView,
  ScrollViewProps as RNScrollViewProps,
} from 'react-native';
import { createNativeSyntheticEvent } from '../utils/createNativeSyntheticEvent';
import { FocusGroup } from './FocusGroup';
import { View, defaultViewStyle } from './View';

type ScrollViewProps = RNScrollViewProps & {
  onChildFocused?: (el: LightningElement) => void;
};

type ScrollViewState = {
  offset: { x: number; y: number };
  animated: boolean;
};

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function getAxisOffset(
  viewportSize: number,
  containerSize: number,
  childOffset: number,
  childSize: number,
  snapToAlignment: 'start' | 'center' | 'end',
): number {
  const scrollableSize = containerSize - viewportSize;
  let offset = 0;

  switch (snapToAlignment) {
    case 'start':
      offset = Math.min(childOffset, scrollableSize);
      break;
    case 'center': {
      const itemMidPoint = childOffset + childSize / 2;
      const halfViewportSize = viewportSize / 2;

      offset = Math.min(
        Math.max(itemMidPoint - halfViewportSize, 0),
        scrollableSize,
      );
      break;
    }
    case 'end':
      offset = Math.max(
        Math.min(childOffset + childSize - viewportSize, scrollableSize),
        0,
      );
      break;
  }

  return Math.max(0, Math.min(offset, containerSize)) * -1;
}

function getScrollInfo(
  viewport?: Rect,
  container?: Rect,
  child?: Rect | null,
  snapToAlignment?: 'start' | 'center' | 'end' | null,
  horizontal?: boolean | null,
): NativeScrollEvent | null {
  if (!viewport || !container || !child) {
    return null;
  }

  const x = horizontal
    ? getAxisOffset(
        viewport.width,
        container.width,
        child.x,
        child.width,
        snapToAlignment ?? 'start',
      )
    : container.x;
  const y = !horizontal
    ? getAxisOffset(
        viewport.height,
        container.height,
        child.y,
        child.height,
        snapToAlignment ?? 'start',
      )
    : container.y;

  return {
    contentInset: { top: 0, left: 0, bottom: 0, right: 0 },
    contentOffset: { x, y },
    contentSize: { width: container.width, height: container.height },
    layoutMeasurement: { width: viewport.width, height: viewport.height },
    zoomScale: 1,
  };
}

export class ScrollView extends Component<ScrollViewProps, ScrollViewState> {
  private _containerRef = createRef<LightningViewElement>();
  private _viewportRef = createRef<LightningViewElement>();

  public static displayName = 'LightningScrollView';

  public constructor(props: ScrollViewProps) {
    super(props);

    this.state = {
      offset: props.contentOffset ?? { x: 0, y: 0 },
      animated: true,
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

    const newOffset = this._getChildOffset({ x, y, width: 0, height: 0 });

    if (newOffset) {
      this._doScroll(newOffset);
    }
  };

  public scrollToElement = (el: LightningElement) => {
    const offset = this._getChildOffset(el);

    if (offset) {
      this._doScroll(offset);
    }
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
        x: this.props.horizontal
          ? containerBounds.width - viewportBounds.width
          : x,
        y: this.props.horizontal
          ? y
          : containerBounds.height - viewportBounds.height,
      },
    });
  };

  public getScrollableNode() {
    return this._viewportRef.current;
  }

  // Undocumented
  public getInnerViewNode() {
    return this._containerRef.current;
  }

  public shouldComponentUpdate(
    nextProps: ScrollViewProps,
    nextState: ScrollViewState,
  ) {
    return (
      !!simpleDiff(this.props, nextProps) || !!simpleDiff(this.state, nextState)
    );
  }

  public render() {
    const {
      children,
      style,
      contentContainerStyle,
      horizontal,
      onChildFocused,
      ...props
    } = this.props;
    const flexDirection = horizontal ? 'row' : 'column';

    return (
      <View
        ref={this._viewportRef}
        style={[
          defaultViewStyle,
          style,
          { overflow: 'hidden', flexDirection, flexGrow: 1, flexShrink: 1 },
        ]}
        {...props}
      >
        <FocusGroup
          ref={this._containerRef}
          transition={
            this.state.animated
              ? {
                  x: { duration: 200 },
                  y: { duration: 200 },
                }
              : undefined
          }
          onChildFocused={onChildFocused}
          style={[
            defaultViewStyle,
            { display: 'flex', flexDirection },
            contentContainerStyle,
            this.state.offset,
          ]}
        >
          {children}
        </FocusGroup>
      </View>
    );
  }

  private _getChildOffset = (child?: LightningElement | null | Rect) => {
    const isElement = child instanceof LightningViewElement;
    const rect = isElement
      ? child.getBoundingClientRect(this._containerRef.current)
      : child;

    return getScrollInfo(
      this._viewportRef.current?.getBoundingClientRect(),
      this._containerRef.current?.getBoundingClientRect(
        this._viewportRef.current,
      ),
      rect,
      // If we're getting offset via a positional value, we make sure we don't
      // use the snapToAlignment to calculate the offset since the offset should
      // already be taken into account.
      isElement ? this.props.snapToAlignment : 'start',
      this.props.horizontal,
    );
  };

  private _doScroll(newOffset: NativeScrollEvent) {
    if (
      newOffset &&
      (this.state.offset.x !== newOffset.contentOffset.x ||
        this.state.offset.y !== newOffset.contentOffset.y)
    ) {
      const { x, y } = newOffset.contentOffset;
      const clampedX = newOffset.layoutMeasurement.width ? x : 0;
      const clampedY = newOffset.layoutMeasurement.height ? y : 0;

      this.setState({ offset: { x: clampedX, y: clampedY } });

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
