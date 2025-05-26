import { Row } from '@plextv/react-lightning-components';
import FlashList from '@plextv/react-native-lightning-components/lists/FlashList';
import type { Meta } from '@storybook/react';
import { useCallback, useRef } from 'react';
import { View } from 'react-native';
import ScrollItem from '../../components/ScrollItem';

export default {
  title: '@plextv∕react-native-lightning-components/Lists/FlashList',
  component: FlashList,
  tags: ['reactNative'],
} as Meta<typeof FlashList>;

export const FlashListExample = () => {
  const buttons = new Array(50).fill(null).map((_, i) => `Flash Button ${i}`);
  const verticalRef = useRef<FlashList<string>>(null);
  const horizontalRef = useRef<FlashList<string>>(null);

  const handleVerticalFocus = useCallback((index: number) => {
    verticalRef.current?.scrollToIndex({ index, viewPosition: 0.5 });
  }, []);

  const handleHorizontalFocus = useCallback((index: number) => {
    horizontalRef.current?.scrollToIndex({ index, viewPosition: 0.5 });
  }, []);

  return (
    <Row key="ListContainer">
      <View
        style={{
          width: 150,
          height: 500,
        }}
      >
        <FlashList
          ref={verticalRef}
          data={buttons}
          renderItem={({ index, item }) => (
            <ScrollItem
              color="rgb(79, 175, 175)"
              altColor="rgb(175, 175, 79)"
              index={index}
              width={100}
              height={50}
              onFocused={handleVerticalFocus}
            >
              {item}
            </ScrollItem>
          )}
          estimatedItemSize={50}
          drawDistance={50}
        />
      </View>

      <View
        style={{
          width: 350,
          height: 200,
        }}
      >
        <FlashList
          ref={horizontalRef}
          data={buttons}
          horizontal
          renderItem={({ index, item }) => (
            <ScrollItem
              horizontal
              color="rgb(175, 175, 79)"
              altColor="rgb(175, 79, 175)"
              image={true}
              index={index}
              width={100}
              height={50}
              onFocused={handleHorizontalFocus}
            >
              {item}
            </ScrollItem>
          )}
          estimatedItemSize={50}
          drawDistance={50}
        />
      </View>
    </Row>
  );
};
