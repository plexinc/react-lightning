import type { Meta } from '@storybook/react';
import { createRef, useCallback } from 'react';
import { View, VirtualizedList } from 'react-native';
import ScrollItem from '../../components/ScrollItem';

export default {
  title: '@plextv∕react-native-lightning/Lists/VirtualizedList',
  component: VirtualizedList,
  tags: ['reactNative'],
} as Meta<typeof VirtualizedList>;

const getItem = (_: string[], index: number) => `Button ${index}`;
const ITEM_WIDTH = 100;
const ITEM_HEIGHT = 50;

export const VirtualizedListTest = () => {
  const ref = createRef<VirtualizedList<string>>();

  const handleFocus = useCallback(
    (index: number) => {
      ref.current?.scrollToIndex({ index, viewPosition: 0.5 });
    },
    [ref.current],
  );

  return (
    <View style={{ width: 500, height: 500 }}>
      <VirtualizedList
        ref={ref}
        removeClippedSubviews={true}
        snapToAlignment="start"
        initialNumToRender={20}
        getItem={getItem}
        getItemCount={() => 5000}
        getItemLayout={(_, index) => ({
          index,
          length: ITEM_HEIGHT,
          offset: index * ITEM_HEIGHT,
        })}
        keyExtractor={(item) => item}
        windowSize={2}
        renderItem={({ index, item }) => (
          <ScrollItem
            color="rgb(79, 175, 175)"
            altColor="rgb(175, 79, 175)"
            index={index}
            width={ITEM_WIDTH}
            height={ITEM_HEIGHT}
            onFocused={handleFocus}
          >
            {item}
          </ScrollItem>
        )}
      />
    </View>
  );
};
