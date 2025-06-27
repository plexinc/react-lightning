import type { LightningElement } from '@plextv/react-lightning';
import { useFocus } from '@plextv/react-lightning';
import { Column, FlashList } from '@plextv/react-native-lightning-components';
import { type FC, useCallback, useEffect, useMemo, useRef } from 'react';
import { Image, Text } from 'react-native';

const ITEM_COUNT = 150;

interface Props {
  title: string;
  subtitle: string;
  seed: number;
  onFocus: (element: LightningElement) => void;
}

const Poster: FC<Props> = ({ title, subtitle, seed, onFocus }) => {
  const { focused, ref } = useFocus();

  useEffect(() => {
    console.log(`Rendering poster ${seed}`);
  });

  return (
    <Column
      ref={ref}
      style={{
        clipping: true,
        width: 250,
        height: 400,
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
  const ref = useRef<FlashList<PosterItem>>(null);

  const handleFocus = useCallback((element: PosterItem) => {
    ref.current?.scrollToItem({ item: element, viewPosition: 0.5 });
  }, []);

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
    <FlashList<PosterItem>
      snapToAlignment="center"
      ref={ref}
      drawDistance={100}
      numColumns={6}
      centerContent={true}
      estimatedItemSize={500}
      estimatedListSize={{ height: 1080, width: 1670 }}
      renderItem={renderItem}
      data={items}
    />
  );
};

export const LibraryTest = () => {
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
