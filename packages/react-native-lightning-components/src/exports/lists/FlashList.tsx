import type { LightningElement } from '@plextv/react-lightning';
import { ScrollView } from '@plextv/react-native-lightning';
import {
  type FlashListProps,
  FlashList as ShopifyFlashList,
} from '@shopify/flash-list';
import { type FC, type LegacyRef, type Ref, forwardRef, useMemo } from 'react';
import CellContainer from './CellContainer';

type FlashList<T> = ShopifyFlashList<T>;

interface ForwardRef extends FC<FlashListProps<unknown>> {
  <T = unknown>(
    props: FlashListProps<T> & { ref: Ref<FlashList<T>> },
  ): ReturnType<FC<FlashListProps<T>>>;
}

const FlashList: ForwardRef = forwardRef(
  <T,>(
    {
      CellRendererComponent,
      renderScrollComponent,
      ...props
    }: FlashListProps<T>,
    ref: Ref<ShopifyFlashList<T>>,
  ) => {
    const CellComponent = useMemo(
      () =>
        forwardRef((componentProps, ref) => {
          const Component = CellRendererComponent ?? CellContainer;

          return (
            <Component
              {...componentProps}
              ref={ref as LegacyRef<LightningElement>}
              estimatedSize={props.estimatedItemSize}
            />
          );
        }),

      [CellRendererComponent, props.estimatedItemSize],
    );

    return (
      <ShopifyFlashList
        CellRendererComponent={CellComponent}
        renderScrollComponent={renderScrollComponent ?? ScrollView}
        ref={ref}
        {...props}
      />
    );
  },
);

FlashList.displayName = 'LightningFlashList';

export type { FlashListProps };

export default FlashList;
