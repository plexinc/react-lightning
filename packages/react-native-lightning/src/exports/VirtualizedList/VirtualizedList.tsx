import type {
  LightningElement,
  LightningViewElement,
  Rect,
} from '@plex/react-lightning';
import React from 'react';
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollResponderMixin,
  View,
  VirtualizedListProps,
  // VirtualizedList as RNVirtualizedList,
} from 'react-native';
import { createLayoutEvent } from '../../utils/createLayoutEvent';
import ScrollView from '../ScrollView';
import VirtualizedListItem from './VirtualizedListItem';

type VirtualizedLayout = {
  length: number;
  offset: number;
  index: number;
};

type VirtualizedListState<T> = {
  childrenRefs: Record<number, React.RefObject<VirtualizedListItem<T>>>;
  itemCount: number;
  itemLayouts: Record<number, VirtualizedLayout>;
  visibleRange: { start: number; count: number };
};

class VirtualizedList<T> extends React.Component<
  VirtualizedListProps<T>,
  VirtualizedListState<T>
> {
  // implements RNVirtualizedList<T>
  private _scrollViewRef: React.RefObject<ScrollView>;
  private _beforeRegionRef: React.RefObject<LightningViewElement>;
  private _afterRegionRef: React.RefObject<LightningViewElement>;

  private _layouts: Record<number, VirtualizedLayout> | null = null;

  public constructor(props: VirtualizedListProps<T>) {
    super(props);

    this.state = {
      childrenRefs: {},
      itemLayouts: {},
      itemCount: 0,
      visibleRange: {
        start: props.initialScrollIndex ?? 0,
        count: props.initialNumToRender ?? 0,
      },
    };

    this._scrollViewRef = React.createRef();
    this._beforeRegionRef = React.createRef();
    this._afterRegionRef = React.createRef();
  }

  public componentDidMount(): void {
    if (this.state.visibleRange.count === 0) {
      const containerHeight = this._getContainerHeight();
      const itemHeight = this.props.getItemLayout?.(this.props.data, 0)?.length;

      if (containerHeight && itemHeight) {
        this.setState({
          visibleRange: {
            start: 0,
            count: Math.floor(containerHeight / itemHeight),
          },
        });
      }
    }

    if (this.state.visibleRange.start !== 0) {
      this.scrollToIndex({
        index: this.state.visibleRange.start,
        animated: false,
      });
    }
  }

  //#region Internal Methods
  // TODO: get these from layout in case it's set by flex or percentage
  protected _getContainerHeight() {
    const style = this.props.style;
    if (style && typeof style === 'object' && 'height' in style) {
      return style.height as number;
    }
    return 0;
  }
  protected _getContainerWidth() {
    const style = this.props.style;
    if (style && typeof style === 'object' && 'width' in style) {
      return style.width as number;
    }
    return 0;
  }
  protected _setItemLayouts(layouts: Record<number, VirtualizedLayout>) {
    this._layouts = { ...this._layouts, ...layouts };
    super.setState({ itemLayouts: this._layouts });
  }
  protected _setItemLayout(index: number, layout: VirtualizedLayout) {
    this._setItemLayouts({ ...this.state.itemLayouts, [index]: layout });
  }
  protected _setVisibleRange(range: { start: number; count: number }) {
    super.setState({ visibleRange: range });
  }

  protected _getSpacerRegionSize(after: boolean) {
    const { itemLayouts, itemCount, visibleRange } = this.state;
    const { horizontal } = this.props;
    const start = after ? visibleRange.start + visibleRange.count + 1 : 0;
    const end = after ? itemCount : visibleRange.start - 1;
    let regionSize = 0;

    for (let i = start; i < end; i++) {
      const layout = itemLayouts?.[i];
      if (layout) {
        regionSize += layout.length;
      }
    }

    return {
      width: horizontal ? regionSize : this._getContainerWidth(),
      height: horizontal ? this._getContainerHeight() : regionSize,
    };
  }

  protected _getChildren() {
    const { data, horizontal, getItem, renderItem, getItemLayout } = this.props;
    const { childrenRefs, itemLayouts, visibleRange, itemCount } = this.state;
    if (!getItem || !renderItem) {
      return [];
    }
    const newChildren: React.ReactNode[] = [];
    const newChildrenRefs: Record<
      number,
      React.RefObject<VirtualizedListItem<T>>
    > = { ...childrenRefs };
    const start = Math.max(visibleRange.start, 0);
    const endGoal = visibleRange.start + visibleRange.count;
    const hasLayouter = itemLayouts !== null;
    let end = endGoal;
    // let beforeRegionSize = 0;
    // let afterRegionSize = 0;
    let i = 0;
    let visibleItemsSize = 0;
    const visibleAreaSize = horizontal
      ? this._getContainerWidth()
      : this._getContainerHeight();
    const layoutCb = getItemLayout ? undefined : this._handleChildLayoutUpdated;

    if (itemCount !== 0) {
      end = Math.min(endGoal, itemCount);
    }

    if (start > 0) {
      i = start - 1;
      const item = getItem(data, i);
      const childRef =
        childrenRefs[i] ?? React.createRef<VirtualizedListItem<T>>();

      newChildrenRefs[i] = childRef;
      newChildren.push(
        <VirtualizedListItem
          key={i}
          ref={childRef}
          item={item}
          index={i}
          renderItem={renderItem}
          onLayoutUpdated={layoutCb}
        />,
      );
    }

    i = start;
    for (
      ;
      i < end && (!hasLayouter || visibleItemsSize < visibleAreaSize);
      i++
    ) {
      const item = getItem(data, i);
      const childRef =
        childrenRefs[i] ?? React.createRef<VirtualizedListItem<T>>();

      newChildrenRefs[i] = childRef;
      newChildren.push(
        <VirtualizedListItem
          key={i}
          item={item}
          index={i}
          renderItem={renderItem}
          onLayoutUpdated={layoutCb}
        />,
      );

      if (hasLayouter && i >= visibleRange.start) {
        const layout = itemLayouts?.[i];
        if (layout) {
          visibleItemsSize += layout.length;
        }
      }
    }

    if (i < itemCount) {
      const item = getItem?.(data, i);
      const childRef =
        childrenRefs[i] ?? React.createRef<VirtualizedListItem<T>>();

      newChildrenRefs[i] = childRef;
      newChildren.push(
        <VirtualizedListItem
          key={i}
          ref={childRef}
          item={item}
          index={i}
          renderItem={renderItem}
          onLayoutUpdated={layoutCb}
        />,
      );
    }

    return newChildren;
  }

  //#endregion

  //#region Event Handlers

  // TODO: fix type
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  protected _handleOnLayout = (event: any) => {
    this.props.onLayout?.(createLayoutEvent(event));
  };

  protected _handleOnScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const { horizontal } = this.props;
    const { itemLayouts, itemCount } = this.state;
    const { contentOffset } = event.nativeEvent;
    const offset = horizontal ? contentOffset.x : contentOffset.y;
    const visibleAreaSize = horizontal
      ? this._getContainerWidth()
      : this._getContainerHeight();
    // const beforeIndex = Math.max(prev.start - 1, 0);
    // const beforeStyle = childrenRefs[beforeIndex]?.current?.style;
    // const endOfBeforeItem = horizontal ? (beforeStyle?.y ?? 0) + (beforeStyle?.height ?? 0) : 0;
    const endOffset = offset + visibleAreaSize;
    let start = -1;
    let end = -1;

    for (let i = 0; i < itemCount; i++) {
      const layout = itemLayouts?.[i];
      if (!layout) {
        continue;
      }
      if (start === -1 && offset < layout?.offset + layout?.length) {
        start = i;
      }
      if (layout && endOffset < layout.offset) {
        end = i - 1;
        break;
      }
    }

    if (end === -1) {
      end = itemCount - 1;
    }

    if (
      this.state.visibleRange.start === start &&
      this.state.visibleRange.count === end - start
    ) {
      return;
    }

    // console.log(
    //   '%cscroll',
    //   'background: #c6f; color: #000',
    //   start,
    //   end,
    //   this.state.visibleRange,
    // );
    this._setVisibleRange({ start, count: end - start });
  };

  protected _handleChildLayoutUpdated = (index: number, layout: Rect) => {
    const prev = this.state.itemLayouts?.[index];
    const length = this.props.horizontal ? layout.width : layout.height;
    const offset = this.props.horizontal ? layout.x : layout.y;

    if (prev && prev.length === length && prev.offset === offset) {
      return;
    }

    this._setItemLayout(index, {
      length,
      offset,
      index,
    });
  };

  //#endregion

  //#region Public Methods

  public flashScrollIndicators(): void {
    // noop
  }

  // biome-ignore lint/suspicious/noExplicitAny: This is actually supposed to be `any` here
  public getScrollableNode(): any {
    return this._scrollViewRef.current?.getScrollableNode();
  }

  public getScrollRef(): ScrollView | View | null {
    return this._scrollViewRef.current;
  }

  public getScrollResponder(): ScrollResponderMixin | null {
    return null;
  }

  public scrollToEnd(params?: { animated?: boolean }): void {
    this._scrollViewRef.current?.scrollToEnd(params);
  }

  public scrollToIndex(params: {
    index: number;
    animated?: boolean;
    viewOffset?: number;
    viewPosition?: number;
  }): void {
    const child = this._scrollViewRef.current?.getChildren()?.[params.index];

    if (child) {
      this._scrollViewRef.current?.scrollIntoView(child);
    }
  }

  public scrollToItem(params: {
    item: T;
    animated?: boolean;
    viewOffset?: number;
    viewPosition?: number;
  }): void {
    this._scrollViewRef.current?.scrollIntoView(
      params.item as LightningElement,
    );
  }

  public scrollToOffset(params: { offset: number; animated?: boolean }): void {
    const args: { x?: number; y?: number; animated?: boolean } = {
      animated: params.animated,
    };

    if (this.props.horizontal) {
      args.x = params.offset;
    } else {
      args.y = params.offset;
    }

    this._scrollViewRef.current?.scrollTo(args);
  }

  //#endregion

  //#region Lifecycle

  protected static _calcLayouts<T>(props: VirtualizedListProps<T>) {
    const { data, getItemCount, getItemLayout } = props;
    let newLayouts: Record<number, VirtualizedLayout> | null = {};

    if (getItemLayout) {
      const count = getItemCount?.(data) ?? 0;
      newLayouts = {};

      for (let i = 0; i < count; i++) {
        const layout = getItemLayout(data, i);
        if (layout) {
          newLayouts[i] = layout;
        }
      }

      return newLayouts;
    }
  }
  static getDerivedStateFromProps<T>(
    nextProps: Readonly<VirtualizedListProps<T>>,
    prevState: Readonly<VirtualizedListState<T>>,
  ): Partial<VirtualizedListState<T>> | null {
    const stateChanges = {} as Partial<VirtualizedListState<T>>;
    const count = nextProps.getItemCount?.(nextProps.data) ?? 0;
    const newLayouts = VirtualizedList._calcLayouts(nextProps);

    if (newLayouts) {
      stateChanges.itemLayouts = newLayouts;
    }
    if (count !== prevState.itemCount) {
      stateChanges.itemCount = count;
    }

    return stateChanges;
  }

  public render() {
    return (
      <ScrollView
        ref={this._scrollViewRef}
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        {...(this.props as any)}
        onScroll={this._handleOnScroll}
      >
        <lng-view
          ref={this._beforeRegionRef}
          style={this._getSpacerRegionSize(false)}
        />
        {this._getChildren()}
        <lng-view
          ref={this._afterRegionRef}
          style={this._getSpacerRegionSize(true)}
        />
      </ScrollView>
    );
  }

  //#endregion
}

export default VirtualizedList;
export { VirtualizedList, type VirtualizedListProps };
