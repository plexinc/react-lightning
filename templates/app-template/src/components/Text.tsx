import type { LightningTextElementStyle } from '@plextv/react-lightning';

type Props = {
  children?: string;
  style?: LightningTextElementStyle;
};

const defaultStyle = { fontSize: 24 };

export const Text = ({ children, style }: Props) => (
  <lng-text style={{ ...defaultStyle, ...style }}>{children}</lng-text>
);
