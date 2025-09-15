import { type LightningElement, useFocus } from '@plextv/react-lightning';
import { Column, Row } from '@plextv/react-lightning-components';
import { useCallback, useState } from 'react';
import Button from '../components/Button';

const TEXT_WIDTH = 1076;
const TEXT_HEIGHT = 160;

export const Question = ({
  text,
  w = TEXT_WIDTH,
}: {
  text: string;
  w?: number;
}) => {
  const { ref, focused } = useFocus<LightningElement>();

  return (
    <lng-view
      ref={ref}
      style={{
        w,
        h: TEXT_HEIGHT,
        color: focused ? 0x551188ff : 0xaabbccff,
      }}
    >
      <lng-text
        style={{
          fontSize: 48,
          maxLines: 3,
          textAlign: 'center',
          autosize: false,
          h: TEXT_HEIGHT,
          y: TEXT_HEIGHT / 2,
          maxWidth: w,
          overflowSuffix: '...',
          mountY: 0.5,
        }}
      >
        {text}
      </lng-text>
    </lng-view>
  );
};

export const Page60 = () => {
  const [text, setText] = useState('This is a single line test.');
  const [w, setW] = useState(TEXT_WIDTH);

  const addText = useCallback(() => {
    setText((prev) => `${prev} this is a test`);
  }, []);
  const reduceW = useCallback(() => {
    setW((prev) => Math.max(0, prev - 100));
  }, []);
  const increaseW = useCallback(() => {
    setW((prev) => Math.min(1600, prev + 100));
  }, []);

  return (
    <>
      <Column
        focusable
        style={{
          gap: 20,
          zIndex: 10,
          position: 'absolute',
          top: 0,
          left: 0,
          w: 1920,
          h: 1080,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Row style={{ gap: 20 }}>
          <Button onPress={addText}>Add text</Button>
          <Button onPress={reduceW}>Shrink</Button>
          <Button onPress={increaseW}>Grow</Button>
        </Row>

        <Question text={text} w={w} />
        <Question text="This is a multi line test. Lorem ipsum dolor sit amet, consectetur adipiscing elit." />
        <Question text="This is a truncation test. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam arcu sem, placerat eu egestas eu, rutrum id neque. Integer rhoncus faucibus ante a tempor. Fusce mollis est sit amet nunc fermentum, ut pellentesque nisl ultrices. Duis ac dolor sed odio feugiat venenatis in ut est. Proin tincidunt posuere accumsan. Etiam lobortis ultrices bibendum. Vivamus consectetur nulla quis mollis aliquet. Nam scelerisque justo in nibh ornare, eu dapibus quam pulvinar. In a libero placerat, sagittis ante quis, maximus turpis. Proin neque eros, eleifend vel est hendrerit, pharetra laoreet nibh. Donec sed urna eu mi iaculis sollicitudin eu in ante. Aliquam ultrices blandit sem, eget suscipit ipsum bibendum in. Fusce nec lorem id dui interdum vestibulum." />
      </Column>
    </>
  );
};
