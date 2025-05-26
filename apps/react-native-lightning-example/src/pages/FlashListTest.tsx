import Row from '@plextv/react-lightning-components/layout/Row';
import FlashList from '@plextv/react-native-lightning-components/lists/FlashList';
import { useCallback, useRef } from 'react';
import { View } from 'react-native';
import ScrollItem from '../components/ScrollItem';

export const FlashListTest = () => {
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
          width: 300,
          height: 800,
        }}
      >
        <FlashList
          ref={verticalRef}
          data={buttons}
          renderItem={({ index, item }) => (
            <ScrollItem
              color="rgb(79, 175, 175)"
              altColor="rgb(175, 79, 175)"
              index={index}
              onFocused={handleVerticalFocus}
            >
              {item}
            </ScrollItem>
          )}
          estimatedItemSize={75}
          drawDistance={75}
          snapToAlignment="center"
        />
      </View>

      <View
        style={{
          width: 600,
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
              altColor="rgb(175, 79, 79)"
              image={true}
              index={index}
              onFocused={handleHorizontalFocus}
            >
              {item}
            </ScrollItem>
          )}
          estimatedItemSize={75}
          drawDistance={75}
          snapToAlignment="center"
        />
      </View>
    </Row>
  );
};
