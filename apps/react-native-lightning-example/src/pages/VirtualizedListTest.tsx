import { createRef, type FC, useCallback } from 'react';
import { VirtualizedList } from 'react-native';
import ScrollItem from '../components/ScrollItem';

export const VirtualizedListTest: FC = () => {
  const ref = createRef<VirtualizedList<{ text: string; isImage: boolean }>>();
  const data = Array.from({ length: 5000 }, (_, i) => ({
    text: `Button ${i}`,
    isImage: Math.random() < 0.5,
  }));

  const handleFocus = useCallback(
    (index: number) => {
      ref.current?.scrollToIndex({ index, viewPosition: 0.5 });
    },
    [ref.current],
  );

  return (
    <VirtualizedList<{ text: string; isImage: boolean }>
      ref={ref}
      data={data}
      removeClippedSubviews={true}
      snapToAlignment="center"
      initialNumToRender={20}
      keyExtractor={(item) => item.text}
      windowSize={2}
      renderItem={({ index, item }) => (
        <ScrollItem
          color="rgb(79, 175, 175)"
          altColor="rgb(175, 175, 79)"
          image={item.isImage}
          index={index}
          onFocused={handleFocus}
        >
          {item.text}
        </ScrollItem>
      )}
    />
  );
};
