import type { LightningElement } from '@plextv/react-lightning';
import { Column, Row } from '@plextv/react-lightning-components';
import { ScrollView } from '@plextv/react-native-lightning';
import { type RefObject, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Button,
  Image,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

const ComponentTest = () => {
  const ref = useRef<ScrollView>();

  const handleChildFocused = useCallback((child: LightningElement) => {
    ref.current?.scrollToElement(child);
  }, []);

  return (
    <Row focusable style={{ gap: 30 }}>
      <Column focusable style={{ width: 700 }}>
        <Text>ScrollView</Text>
        <ScrollView
          ref={ref as RefObject<ScrollView>}
          onChildFocused={handleChildFocused}
          snapToAlignment="center"
          style={{ width: 700, height: 400 }}
        >
          <Button title="This is the top" color="blue" />
          <Text
            style={{
              zIndex: 99,
              fontSize: 50,
            }}
          >
            This is a text component
          </Text>
          <Text
            style={{
              zIndex: 99,
              fontSize: 24,
              width: 400,
              maxWidth: 400,
            }}
            ellipsizeMode="tail"
            numberOfLines={3}
          >
            This is a text component that overflows. Lorem ipsum dolor sit amet,
            consectetur adipiscing elit. Donec tellus libero, maximus sit amet
            lorem quis, vehicula vestibulum magna. Donec eget consequat erat.
            Donec lorem erat, lacinia a ultricies a, consectetur vitae ipsum.
            Integer at viverra eros. Nullam nec lectus et enim faucibus
            molestie. Etiam porttitor pharetra mauris, quis sodales quam
            molestie sed. Cras consectetur interdum purus, ut malesuada nisl
            ultricies sit amet. Aliquam cursus orci ipsum, a vestibulum tortor
            pellentesque in. Donec non urna facilisis nisl laoreet mollis nec
            vitae dolor. Phasellus dictum ac quam ac laoreet. Morbi pellentesque
            varius odio, vel pretium orci pretium eget. Nam ultrices lorem urna,
            in mattis quam commodo a. Morbi fermentum, tellus at condimentum
            rhoncus, quam neque lacinia nibh, quis tincidunt orci metus sed
            metus.
          </Text>
          <ActivityIndicator size="large" />
          <Button title="This is a green Button" color="green" />
          <Button title="This is a blue Button" color="blue" />
          <View
            style={{
              backgroundColor: '#f00',
              width: 400,
              height: 50,
            }}
          >
            <Text style={{ color: '#000000' }}>
              This is a View with a red background
            </Text>
          </View>
          <TouchableOpacity
            style={{
              backgroundColor: 'blue',
              width: 500,
              height: 50,
            }}
          >
            <Text>This is a TouchableOpacity with a blue background</Text>
          </TouchableOpacity>
          <TouchableWithoutFeedback
            style={{
              backgroundColor: '#9933cc',
              height: 50,
            }}
          >
            <Text>
              This is a TouchableWithoutFeedback with a purple background
            </Text>
          </TouchableWithoutFeedback>
          <Image
            source={{ uri: 'https://picsum.photos/200/300' }}
            width={100}
          />
          <Button title="This is the bottom" color="blue" />
        </ScrollView>
      </Column>
    </Row>
  );
};

export { ComponentTest };
