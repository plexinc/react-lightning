import { FocusGroup } from '@plex/react-lightning';
import { Column } from '@plex/react-lightning-components';
import { FlashList } from '@shopify/flash-list';
import { Text } from 'react-native';

type Item = { title: string };

const DATA: Item[] = [
  {
    title: 'First Item',
  },
  {
    title: 'Second Item',
  },
  {
    title: 'Third Item',
  },
];

const Item = ({ item }: { item: Item }) => (
  <FocusGroup
    style={{
      color: 0xffb400ff,
      width: 200,
      height: 200,
    }}
  >
    <Text>Testing: {item.title}</Text>
  </FocusGroup>
);

export const FlashListTest = () => {
  return (
    <Column focusable style={{ flex: 1 }}>
      <FlashList
        data={DATA}
        renderItem={({ item }) => <Item item={item} />}
        estimatedItemSize={200}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
    </Column>
  );
};
