import type { KeyEvent, LightningElement } from '@plextv/react-lightning';
import { Keys, useFocus } from '@plextv/react-lightning';
import { Column, Row } from '@plextv/react-lightning-components';
import { ScrollView } from '@plextv/react-native-lightning';
import {
  type FC,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Image, Text } from 'react-native';

const COLUMN_COUNT = 6;
const ROW_COUNT = 7;

interface Props {
  title: string;
  subtitle: string;
  seed: number;
  alpha?: number;
  onFocus: (element: LightningElement) => void;
}

const Poster: FC<Props> = ({ alpha = 1, title, subtitle, seed, onFocus }) => {
  const { focused, ref } = useFocus();

  useEffect(() => {
    console.log(`Rendering poster ${seed}`);
  });

  return (
    <Column
      ref={ref}
      style={{
        // @ts-expect-error TODO
        opacity: alpha,
        width: 185,
        height: 328,
        scale: focused ? 1.3 : 1,
      }}
      transition={{
        scale: { duration: 250 },
      }}
      onFocus={onFocus}
    >
      <Image
        style={{ opacity: alpha }}
        src={`https://picsum.photos/185/278?seed=${seed}`}
      />
      <Text
        style={{
          opacity: alpha,
          fontSize: 30,
          fontWeight: 'bold',
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          opacity: alpha,
          fontSize: 20,
          fontWeight: 'normal',
          textAlign: 'center',
        }}
      >
        {subtitle}
      </Text>
    </Column>
  );
};

const LibraryView = ({
  items,
}: {
  items: { index: number; title: string; subtitle: string; seed: number }[];
}) => {
  const ref = useRef<ScrollView>();

  const handleFocus = useCallback((element: LightningElement) => {
    ref.current?.scrollToElement(element);
  }, []);

  return (
    <ScrollView snapToAlignment="center" ref={ref as RefObject<ScrollView>}>
      <Row
        focusable
        style={{
          flexWrap: 'wrap',
          justifyContent: 'center',
          rowGap: 100,
          columnGap: 50,
        }}
        transition={{ y: { duration: 250 } }}
      >
        {items.map((item) => (
          <Poster
            key={item.seed}
            seed={item.seed}
            subtitle={item.subtitle}
            title={item.title}
            onFocus={handleFocus}
          />
        ))}
      </Row>
    </ScrollView>
  );
};

export const LibraryTest = () => {
  const [numRows, setNumRows] = useState(ROW_COUNT);

  const handleKeyDown = useCallback(
    (e: KeyEvent) => {
      switch (e.remoteKey) {
        case Keys.Enter:
          setNumRows(numRows + 1);
          break;
        case Keys.Back:
          setNumRows(Math.max(numRows - 1, 1));
          break;
      }

      return true;
    },
    [numRows],
  );

  const items = useMemo(
    () =>
      Array.from({ length: numRows * COLUMN_COUNT })
        .fill(null)
        .map((_col, i) => ({
          index: i,
          title: `Item #${i}`,
          subtitle: `This is item ${(i % COLUMN_COUNT) + 1} of row ${Math.floor(i / COLUMN_COUNT) + 1}`,
          seed: i,
        })),
    [numRows],
  );

  return (
    <Column
      focusable
      style={{ y: 50, width: 1670, height: 1030 }}
      onKeyDown={handleKeyDown}
    >
      <Text
        style={{
          zIndex: 99,
          fontSize: 50,
          // @ts-expect-error TODO
          y: 50,
        }}
      >
        Rows: {numRows}
      </Text>

      <LibraryView items={items} />
    </Column>
  );
};
