import { focusable } from '@plextv/react-lightning';
import { Column } from '@plextv/react-lightning-components';
import VirtualList from '@plextv/react-lightning-components/lists/VirtualList';

import { ScrollItem, type ScrollItemProps } from '../components/ScrollItem';

const FlexItem = focusable<ScrollItemProps>((props) => {
  return (
    <lng-view style={{ display: 'flex' }}>
      <ScrollItem {...props} />
      <lng-text text={`Flex #${props.index}`} />
    </lng-view>
  );
});

const Header = () => (
  <lng-view style={{ w: 500, h: 30, color: 0x333333ff }}>
    <lng-text style={{ fontSize: 16, color: 0xffffffff, x: 8, y: 6 }}>VirtualList Header</lng-text>
  </lng-view>
);

const HorizontalHeader = () => (
  <lng-view style={{ w: 46, h: 100, color: 0x333333ff }}>
    <lng-text
      style={{
        fontSize: 16,
        color: 0xffffffff,
        mount: 0.5,
        x: 23,
        y: 50,
        rotation: Math.PI / 2,
      }}
    >
      Header
    </lng-text>
  </lng-view>
);

const HorizontalFooter = () => (
  <lng-view style={{ w: 46, h: 100, color: 0x333333ff }}>
    <lng-text
      style={{
        fontSize: 16,
        color: 0xffffffff,
        x: 23,
        y: 50,
        mount: 0.5,
        rotation: Math.PI / 2,
      }}
    >
      Footer
    </lng-text>
  </lng-view>
);

const Footer = () => (
  <lng-view style={{ w: 500, h: 100, color: 0x333333ff }}>
    <lng-text style={{ fontSize: 16, color: 0xffffffff, x: 8, y: 6 }}>End of List</lng-text>
  </lng-view>
);

const Separator = () => <lng-view style={{ w: 500, h: 10, color: 0x555555ff }} />;

const Separator2 = () => <lng-view style={{ w: 20, h: 100, color: 0x555555ff }} />;

export const VirtualListPage = () => {
  const items = Array.from({ length: 40 }, (_, i) => `Item ${i}`);
  const horizontalItems = Array.from({ length: 40 }, (_, i) => `H-${i}`);

  return (
    <Column style={{ w: 500, h: 800, color: 0x22220055 }}>
      <VirtualList
        data={horizontalItems}
        horizontal
        estimatedItemSize={75}
        drawDistance={150}
        ListHeaderComponent={HorizontalHeader}
        listHeaderSize={46}
        ListFooterComponent={HorizontalFooter}
        listFooterSize={46}
        ItemSeparatorComponent={Separator2}
        contentContainerStyle={{ paddingVertical: 25 }}
        // ScrollItem multiplies width by 1.25 on every 3rd item; mirror
        // that here so the cell wrapper allocates the right slot.
        overrideItemLayout={(layout, _item, index) => {
          layout.size = Math.round(index % 3 === 0 ? 75 * 1.25 : 75);
        }}
        renderItem={({ index, item }) => (
          <FlexItem
            horizontal
            color={0xafaf4fff}
            altColor={0xaf4fafff}
            index={index}
            width={75}
            height={100}
          >
            {item}
          </FlexItem>
        )}
      />

      <VirtualList
        data={items}
        estimatedItemSize={50}
        drawDistance={200}
        ListHeaderComponent={Header}
        listHeaderSize={30}
        ListFooterComponent={Footer}
        listFooterSize={100}
        ItemSeparatorComponent={Separator}
        // ScrollItem multiplies height by 1.5 on every 3rd item.
        overrideItemLayout={(layout, _item, index) => {
          layout.size = Math.round(index % 3 === 0 ? 50 * 1.5 : 50);
        }}
        renderItem={({ index, item }) => (
          <ScrollItem
            color={0x4fafafff}
            altColor={0xafaf4fff}
            index={index}
            width={500}
            height={50}
          >
            {item}
          </ScrollItem>
        )}
      />
    </Column>
  );
};
