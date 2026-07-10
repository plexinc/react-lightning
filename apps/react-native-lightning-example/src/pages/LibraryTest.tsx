import { type FC, useCallback, useMemo, useRef } from 'react';
import { Image, Text } from 'react-native';

import type { LightningElement } from '@plextv/react-lightning';
import { useFocus } from '@plextv/react-lightning';
import type { VirtualListRef } from '@plextv/react-lightning-components/lists/VirtualList';
import VirtualList from '@plextv/react-lightning-components/lists/VirtualList';
import { Column } from '@plextv/react-native-lightning-components';

const ITEM_COUNT = 150;

interface Props {
  title: string;
  subtitle: string;
  seed: number;
  onFocus: (element: LightningElement) => void;
}

const Poster: FC<Props> = ({ title, subtitle, seed, onFocus }) => {
  const { focused, ref } = useFocus();

  return (
    <Column
      ref={ref}
      style={{
        clipping: true,
        w: 250,
        h: 400,
        scale: focused ? 1.3 : 1,
      }}
      transition={{
        scale: { duration: 250 },
      }}
      onFocus={onFocus}
    >
      <Image src={`https://picsum.photos/200/300?seed=${seed}`} />
      <Text
        style={{
          fontSize: 30,
          fontWeight: 'bold',
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontSize: 20,
          fontWeight: 'normal',
          textAlign: 'center',
        }}
      >
        {subtitle}
      </Text>
    </Column>
  );
};

type PosterItem = {
  index: number;
  title: string;
  subtitle: string;
  seed: number;
};

const LibraryView = ({ items }: { items: PosterItem[] }) => {
  const ref = useRef<VirtualListRef>(null);

  const handleFocus = useCallback(
    (item: PosterItem) => {
      const index = items.indexOf(item);
      if (index >= 0) {
        ref.current?.scrollToIndex({ index, viewPosition: 0.5 });
      }
    },
    [items],
  );

  const renderItem = useCallback(
    ({ item }: { item: PosterItem }) => (
      <Poster
        seed={item.seed}
        title={item.title}
        subtitle={item.subtitle}
        onFocus={() => handleFocus(item)}
      />
    ),
    [handleFocus],
  );

  return (
    <VirtualList<PosterItem>
      ref={ref}
      snapToAlignment="center"
      drawDistance={100}
      numColumns={6}
      ItemSeparatorComponent={() => <lng-view style={{ w: 20, h: 1 }} />}
      contentContainerStyle={{ paddingHorizontal: 25 }}
      style={{ w: 1670, h: 1080 }}
      renderItem={renderItem}
      data={items}
    />
  );
};

export const LibraryTest: FC = () => {
  const items = useMemo(
    () =>
      Array.from({ length: ITEM_COUNT })
        .fill(null)
        .map((_col, i) => ({
          index: i,
          title: `Item #${i}`,
          subtitle: `This is item ${(i % 6) + 1} of row ${Math.floor(i / 6) + 1}`,
          seed: i,
        })),
    [],
  );

  return <LibraryView items={items} />;
};
