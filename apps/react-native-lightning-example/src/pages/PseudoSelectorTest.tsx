import type { FC } from 'react';
import { Text, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { Row } from '@plextv/react-lightning-components';

// This repo pins reanimated 4.3, whose CSSStyle type doesn't know pseudo
// selectors yet, hence the casts below. The shape is what 4.6 ships.
const asStyle = (style: object) => style as unknown as ViewStyle;

// How far the labels drop so they clear the scaled artwork.
const LABEL_SHIFT = 24;

// The column shifts on :focus-within so the labels move with it, and the card
// cancels the shift for itself: only the labels end up moving.
const tileStyle = {
  transform: {
    default: [{ translateY: 0 }],
    ':focus-within': [{ translateY: LABEL_SHIFT }],
  },
  transitionProperty: 'transform',
  transitionDuration: 200,
  transitionTimingFunction: 'ease-out',
};

const cardStyle = {
  transform: {
    default: [{ translateY: 0 }, { scale: 1 }],
    ':focus': [{ translateY: -LABEL_SHIFT }, { scale: 1.08 }],
  },
  backgroundColor: '#26282c',
  // The focus ring is an outline on the card itself, so it needs no extra view.
  // Fading from a transparent white keeps it from going through black.
  outlineStyle: 'solid' as const,
  outlineWidth: 4,
  outlineOffset: 2,
  outlineColor: { default: 'rgba(255, 255, 255, 0)', ':focus': '#e5a00d' },
  transitionProperty: ['transform', 'outlineColor'],
  transitionDuration: [200, 120],
  transitionTimingFunction: ['cubic-bezier(0.22, 1, 0.36, 1)', 'ease-out'],
};

const Tile = ({ title }: { title: string }) => (
  <Animated.View style={[{ width: 220, gap: 16 }, asStyle(tileStyle)]}>
    <Animated.View
      focusable
      style={[{ width: 220, height: 320, borderRadius: 8 }, asStyle(cardStyle)]}
    />
    <Text style={{ fontSize: 24 }}>{title}</Text>
  </Animated.View>
);

const PseudoSelectorTest: FC = () => (
  <Row focusable style={{ gap: 40, padding: 60 }}>
    {['One', 'Two', 'Three', 'Four'].map((title) => (
      <Tile key={title} title={title} />
    ))}
  </Row>
);

export { PseudoSelectorTest };
export default PseudoSelectorTest;
