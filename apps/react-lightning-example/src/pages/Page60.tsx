import { type LightningElement, useFocus } from '@plex/react-lightning';
import { Column, Row } from '@plex/react-lightning-components';
import { useCallback, useState } from 'react';
import Button from '../components/Button';

const TEXT_WIDTH = 1076;
const TEXT_HEIGHT = 132;
export const Question = ({ text, w }: { text: string; w?: number }) => {
  const { ref, focused } = useFocus<LightningElement>();

  return (
    <lng-view
      ref={ref}
      style={{
        width: w ?? TEXT_WIDTH,
        height: TEXT_HEIGHT,
        color: focused ? 0x551188ff : 0xaabbccff,
      }}
    >
      <lng-text
        style={{
          fontFamily: 'Ubuntu',
          fontSize: 48,
          maxLines: 3,
          textAlign: 'center' as const,
          width: w ?? TEXT_WIDTH,
          height: TEXT_HEIGHT,
          contain: 'width',
          overflowSuffix: '...',
          y: TEXT_HEIGHT / 2,
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
    setText(`${text} this is a test`);
  }, [text]);
  const reduceW = useCallback(() => {
    setW(w - 100);
  }, [w]);
  const increaseW = useCallback(() => {
    setW(w + 100);
  }, [w]);

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
          width: 1920,
          height: 1080,
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
