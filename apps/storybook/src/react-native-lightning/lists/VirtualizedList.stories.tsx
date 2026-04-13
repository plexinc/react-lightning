import type { Meta } from '@storybook/react-vite';
import { createRef } from 'react';
import { VirtualizedList } from 'react-native';

import ScrollItem from '../../components/ScrollItem';

export default {
  title: 'react-native-lightning/Lists/VirtualizedList',
  component: VirtualizedList,
  tags: ['reactNative'],
} as Meta<typeof VirtualizedList>;

export const VirtualizedListTest = () => {
  const ref = createRef<VirtualizedList<{ text: string; isImage: boolean }>>();
  const data = Array.from({ length: 5000 }, (_, i) => ({
    text: `Button ${i}`,
    isImage: Math.random() < 0.5,
  }));

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
        <ScrollItem color={0x4fafaf} altColor={0xafaf4f} index={index}>
          {item.text}
        </ScrollItem>
      )}
    />
  );
};
