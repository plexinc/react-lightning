import { type FC, forwardRef, type LegacyRef, type Ref } from 'react';
import {
  VirtualizedList as RNVirtualizedList,
  type VirtualizedListProps as RNVirtualizedListProps,
} from 'react-native-web';
import { ScrollView } from './ScrollView';

export type VirtualizedListProps<T> = RNVirtualizedListProps<T>;
export type VirtualizedList<T> = RNVirtualizedList<T>;

interface ForwardRef extends FC<VirtualizedListProps<unknown>> {
  <T = unknown>(
    props: VirtualizedListProps<T> & { ref: Ref<VirtualizedList<T>> },
  ): ReturnType<FC<VirtualizedListProps<T>>>;
}

export const VirtualizedList: ForwardRef = forwardRef(
  <T,>(
    { renderScrollComponent, ...props }: VirtualizedListProps<T>,
    ref: LegacyRef<VirtualizedList<T>>,
  ) => (
    <RNVirtualizedList
      {...props}
      ref={ref}
      renderScrollComponent={
        // If a renderScrollComponent was not provided, make sure we use our
        // own ScrollView since the RN one doesn't work in Lightning
        renderScrollComponent ?? ((props) => <ScrollView {...props} />)
      }
    />
  ),
);

VirtualizedList.displayName = 'LightningVirtualizedList';
