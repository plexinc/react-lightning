import type { VirtualListRef } from '@plextv/react-lightning-components/lists/VirtualList';
import VirtualList from '@plextv/react-lightning-components/lists/VirtualList';
import { type VirtualListProps } from '@plextv/react-lightning-components/lists/VirtualList';

export type VirtualizedListProps<T> = VirtualListProps<T>;
export type VirtualizedList = VirtualListRef;

export const VirtualizedList: typeof VirtualList = VirtualList;
