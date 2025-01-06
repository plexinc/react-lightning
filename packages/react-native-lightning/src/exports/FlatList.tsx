import type { LightningViewElement } from '@plex/react-lightning';
import type { RefAttributes } from 'react';
import React from 'react';
import type {
  // FlatList as RNFlatList,
  FlatListProps as RNFlatListProps,
  ScrollResponderMixin,
  View,
} from 'react-native';
import type ScrollView from './ScrollView';
import type { VirtualizedListProps } from './VirtualizedList/VirtualizedList';
import { VirtualizedList } from './VirtualizedList/VirtualizedList';

type FlatListProps<T> = RNFlatListProps<T> &
  RefAttributes<LightningViewElement>;

type KeyedItem = { key?: string | number; id?: string | number };

function getItemDefault<T>(data: T[], index: number): T {
  // biome-ignore lint/style/noNonNullAssertion: We can assume data is not empty
  return data[index]!;
}
function getItemKeyDefault<T extends KeyedItem>(
  item: T,
  index: number,
): string {
  return (item.key ?? item.id ?? index).toString();
}
function getItemCountDefault<T>(data: T[] | null | undefined): number {
  return data ? data.length : 0;
}

const renderAsText = ({ item }: { item: unknown }) => {
  return <lng-text style={{ fontFamily: 'Ubuntu' }}>{String(item)}</lng-text>;
};

class FlatList<T> extends React.Component<FlatListProps<T>> {
  // implements RNFlatList<T>
  protected _listRef: React.RefObject<VirtualizedList<T>>;

  public constructor(props: FlatListProps<T>) {
    super(props);

    this._listRef = React.createRef();
  }

  //#region Public Methods

  public flashScrollIndicators() {
    this._listRef.current?.flashScrollIndicators();
  }

  public getScrollableNode() {
    return this._listRef.current?.getScrollableNode();
  }

  public getScrollRef(): ScrollView | View | null {
    return this._listRef.current?.getScrollRef() ?? null;
  }

  public getScrollResponder(): ScrollResponderMixin | null {
    return this._listRef.current?.getScrollResponder() ?? null;
  }

  public scrollToOffset(params: { offset: number; animated?: boolean }) {
    this._listRef.current?.scrollToOffset(params);
  }

  public scrollToItem(params: {
    item: T;
    viewPosition?: number;
    viewOffset?: number;
    animated?: boolean;
  }) {
    this._listRef.current?.scrollToItem(params);
  }

  public scrollToIndex(params: {
    index: number;
    animated?: boolean;
    viewOffset?: number;
    viewPosition?: number;
  }) {
    this._listRef.current?.scrollToIndex(params);
  }

  public scrollToEnd(params?: { animated?: boolean }) {
    this._listRef.current?.scrollToEnd(params);
  }

  //#endregion

  //#region Lifecycle

  public render() {
    return (
      <VirtualizedList
        ref={this._listRef}
        data={this.props.data}
        renderItem={this.props.renderItem ?? renderAsText}
        getItem={this.props.getItem ?? getItemDefault}
        getItemCount={this.props.getItemCount ?? getItemCountDefault}
        keyExtractor={
          this.props.keyExtractor ??
          (getItemKeyDefault as (item: T, index: number) => string)
        }
        {...(this.props as Partial<VirtualizedListProps<T>>)}
      />
    );
  }

  //#endregion
}

export { FlatList, type FlatListProps };
export default FlatList;
