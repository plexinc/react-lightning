import { createRef, type FC, useCallback } from 'react';
import { VirtualizedList } from 'react-native';
import ScrollItem from '../components/ScrollItem';

const getItem = (_data: string[], index: number) => `Button ${index}`;

export const VirtualizedListTest: FC = () => {
  const ref = createRef<VirtualizedList<string>>();

  const handleFocus = useCallback(
    (index: number) => {
      ref.current?.scrollToIndex({ index, viewPosition: 0.5 });
    },
    [ref.current],
  );

  return (
    <VirtualizedList
      ref={ref}
      removeClippedSubviews={true}
      snapToAlignment="center"
      initialNumToRender={20}
      getItem={getItem}
      getItemCount={() => 5000}
      getItemLayout={(_, index) => ({
        index,
        length: 75,
        offset: index * 75,
      })}
      keyExtractor={(item) => item}
      windowSize={2}
      renderItem={({ index, item }) => (
        <ScrollItem
          color="rgb(79, 175, 175)"
          altColor="rgb(175, 175, 79)"
          image={true}
          index={index}
          onFocused={handleFocus}
        >
          {item}
        </ScrollItem>
      )}
    />
  );
};
