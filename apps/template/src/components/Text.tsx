import type { LightningTextElementStyle } from '@plex/react-lightning';

type Props = {
  children?: string;
  style?: LightningTextElementStyle;
};

const defaultStyle = { fontFamily: 'Ubuntu', fontSize: 24 };

export const Text = ({ children, style }: Props) => (
  <lng-text style={{ ...defaultStyle, ...style }}>{children}</lng-text>
);
