import {
  type LightningElement,
  type LightningViewElement,
  simpleDiff,
} from '@plex/react-lightning';
import React from 'react';
import type { RefAttributes } from 'react';
import type { ScrollViewProps as RNScrollViewProps } from 'react-native';
import { createNativeSyntheticEvent } from '../utils/createNativeSyntheticEvent';
import { FocusGroup } from './FocusGroup';
import { View, defaultViewStyle } from './View';

type ScrollViewProps = RNScrollViewProps & RefAttributes<LightningViewElement>;
type ScrollViewState = {
  scrollOffset: { top: number; left: number };
  animated: boolean;
};

class ScrollView extends React.Component<ScrollViewProps, ScrollViewState> {
  // implements RNScrollView
  protected _containerRef: React.RefObject<LightningViewElement>;
  protected _contentRef: React.RefObject<LightningViewElement>;

  public constructor(props: ScrollViewProps) {
    super(props);

    this.state = {
      scrollOffset: { top: 0, left: 0 },
      animated: false,
    };
    this._containerRef = React.createRef();
    this._contentRef = React.createRef();
  }

  //#region Internal Methods

  protected _getContentHeight() {
    // TODO: Super hacky, but the content element is sometimes not sized
    // properly to the children, so we'll take the bigger of the two.
    return Math.max(
      this._contentRef.current?.node.height ?? 0,
      this._contentRef.current?.children[0]?.node.height ?? 0,
    );
  }
  protected _getContentWidth() {
    return Math.max(
      this._contentRef.current?.node.width ?? 0,
      this._contentRef.current?.children[0]?.node.width ?? 0,
    );
  }

  protected _getContentOffset() {
    return (
      this._contentRef.current?.getRelativePosition(
        this._containerRef.current,
      ) ?? { x: 0, y: 0 }
    );
  }

  protected _getContainerHeight() {
    return this._containerRef.current?.node.height ?? 0;
  }
  protected _getContainerWidth() {
    return this._containerRef.current?.node.width ?? 0;
  }

  protected _setScrollOffset(offset: { top: number; left: number }) {
    this.setState({ scrollOffset: offset });

    this.props.onScroll?.(
      createNativeSyntheticEvent({
        contentOffset: { x: -offset.left, y: -offset.top },
        contentSize: {
          width: this._getContentWidth(),
          height: this._getContentHeight(),
        },
        contentInset: { top: 0, left: 0, bottom: 0, right: 0 },
        layoutMeasurement: { width: 0, height: 0 },
        zoomScale: 1,
      }),
    );
  }

  //#endregion

  //#region Event Handlers

  protected _handleChildFocused = (child: LightningElement) => {
    this.scrollIntoView(child);
  };

  //#endregion

  //#region Public Methods

  public getScrollableNode() {
    return this._containerRef.current;
  }

  public getChildren() {
    return this.getScrollableNode()?.children[0]?.children ?? [];
  }

  public flashScrollIndicators() {
    // noop
  }

  public scrollTo({
    x = 0,
    y = 0,
    animated = true,
  }: {
    x?: number;
    y?: number;
    animated?: boolean;
  }) {
    const offset = this._getContentOffset();
    const containerH = this._getContainerHeight();
    const containerW = this._getContainerWidth();
    const scrollableHeight = containerH
      ? this._getContentHeight() - containerH
      : 0;
    const scrollableWidth = containerW
      ? this._getContentWidth() - containerW
      : 0;

    this._setScrollOffset({
      left: -Math.max(0, Math.min(Math.abs(x ?? offset.x), scrollableWidth)),
      top: -Math.max(0, Math.min(Math.abs(y ?? offset.y), scrollableHeight)),
    });
    this.setState({ animated });
  }

  public scrollToEnd({ animated = true }: { animated?: boolean } = {}) {
    this.scrollTo(
      this.props.horizontal
        ? { x: this._getContentWidth(), animated: animated }
        : { y: this._getContentHeight(), animated: animated },
    );
  }

  public scrollIntoView(child: LightningElement) {
    const { x, y } = child.getRelativePosition(this._contentRef.current);
    const { width, height } = child.node;
    const offset = this._getContentOffset();
    const containerW = this._getContainerWidth();
    const containerH = this._getContainerHeight();
    const containerX = Math.abs(offset.x);
    const containerY = Math.abs(offset.y);
    const scrollableHeight = containerH
      ? this._getContentHeight() - containerH
      : 0;
    const scrollableWidth = containerW
      ? this._getContentWidth() - containerW
      : 0;

    const params = { x: containerX, y: containerY };

    if (this.props.horizontal) {
      params.x = this._getTargetOffset(
        x,
        width,
        containerW,
        scrollableWidth,
        this.props.snapToAlignment,
      );
    } else {
      params.y = this._getTargetOffset(
        y,
        height,
        containerH,
        scrollableHeight,
        this.props.snapToAlignment,
      );
    }

    this.scrollTo(params);
  }

  private _getTargetOffset(
    itemPos: number,
    itemSize: number,
    containerSize: number,
    scrollableSize: number,
    snapToAlignment?: 'start' | 'center' | 'end',
  ) {
    let offset = 0;

    switch (snapToAlignment) {
      case 'end':
        offset = Math.max(
          Math.min(itemPos + itemSize - containerSize, scrollableSize),
          0,
        );
        break;
      case 'start':
        offset = Math.min(itemPos, scrollableSize);
        break;
      default: {
        const itemMidPoint = itemPos + itemSize / 2;
        const halfContainerSize = containerSize / 2;

        offset = Math.min(
          Math.max(itemMidPoint - halfContainerSize, 0),
          scrollableSize,
        );

        break;
      }
    }

    return Math.max(0, Math.min(offset, scrollableSize));
  }

  //#endregion

  //#region Lifecycle

  public shouldComponentUpdate(
    nextProps: ScrollViewProps,
    nextState: ScrollViewState,
  ) {
    return (
      !!simpleDiff(this.props, nextProps) || !!simpleDiff(this.state, nextState)
    );
  }

  public render() {
    return (
      <View
        ref={this._containerRef}
        {...this.props}
        style={[
          { overflow: 'hidden', flexGrow: 1, flexShrink: 1 },
          this.props.style,
        ]}
        onLayout={this.props.onLayout}
      >
        <FocusGroup
          ref={this._contentRef}
          style={[
            defaultViewStyle,
            {
              flexDirection: this.props.horizontal ? 'row' : 'column',
            },
            this.state.scrollOffset,
            this.props.contentContainerStyle,
          ]}
          transition={
            this.state.animated
              ? {
                  x: { duration: 200 },
                  y: { duration: 200 },
                }
              : undefined
          }
          onChildFocused={this._handleChildFocused}
          onLayout={this.props.onLayout}
        >
          {this.props.children}
        </FocusGroup>
      </View>
    );
  }

  //#endregion
}

export { ScrollView, type ScrollViewProps };
export default ScrollView;
