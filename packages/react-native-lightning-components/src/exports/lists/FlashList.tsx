import type { LightningElement } from '@plextv/react-lightning';
import { ScrollView } from '@plextv/react-native-lightning';
import {
  type FlashListProps,
  FlashList as ShopifyFlashList,
} from '@shopify/flash-list';
import {
  forwardRef,
  type LegacyRef,
  type ReactElement,
  type Ref,
  useMemo,
} from 'react';
import CellContainer from './CellContainer';

type FlashList<T> = ShopifyFlashList<T>;

function FlashListImpl<T>(
  { CellRendererComponent, renderScrollComponent, ...props }: FlashListProps<T>,
  ref: Ref<T>,
) {
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
      ref={ref as LegacyRef<ShopifyFlashList<T>>}
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
