import type { LightningElement } from '@plextv/react-lightning';
import { ScrollView } from '@plextv/react-native-lightning';
import {
  type FlashListRef,
  FlashList as ShopifyFlashList,
  type FlashListProps as ShopifyFlashListProps,
} from '@shopify/flash-list';
import { forwardRef, type ReactElement, type Ref, useMemo } from 'react';
import CellContainer from './CellContainer';

type FlashList<T> = FlashListRef<T>;
type FlashListProps<T> = ShopifyFlashListProps<T> & {
  estimatedItemSize?: number;
  estimatedListSize?: { width: number; height: number };
};

function FlashListImpl<T>(
  { CellRendererComponent, renderScrollComponent, ...props }: FlashListProps<T>,
  ref: Ref<FlashListRef<T>>,
) {
  const CellComponent = useMemo(
    () =>
      forwardRef((componentProps, cellRef) => {
        const Component = CellRendererComponent ?? CellContainer;

        return (
          <Component
            {...componentProps}
            ref={cellRef as Ref<LightningElement>}
            estimatedSize={props.estimatedItemSize}
          />
        );
      }),

    [CellRendererComponent, props.estimatedItemSize],
  );

  return (
    <ShopifyFlashList
      ref={ref}
      CellRendererComponent={CellComponent}
      renderScrollComponent={
        // If a renderScrollComponent was not provided, make sure we use our
        // own ScrollView since the RN one doesn't work in Lightning
        renderScrollComponent ?? ((props) => <ScrollView {...props} />)
      }
      {...props}
    />
  );
}

const FlashList = forwardRef(FlashListImpl) as <T>(
  props: FlashListProps<T> & { ref: Ref<FlashList<T>> },
) => ReactElement;

FlashListImpl.displayName = 'LightningFlashList';

export type { FlashListProps };

export default FlashList;
