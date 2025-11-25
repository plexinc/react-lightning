import {
  type LightningViewElement,
  type LightningViewElementProps,
  type LightningViewElementStyle,
  useFocus,
} from '@plextv/react-lightning';
import { Column } from '@plextv/react-lightning-components';
import { getImageUrl } from '../api/getImageUrl';
import type { Metadata } from '../api/types/Metadata';

interface Props extends LightningViewElementProps {
  metadata: Metadata;
  style?: LightningViewElementStyle;
}

export const HubItem = ({ metadata, style, ...rest }: Props) => {
  const poster = metadata.Image?.find((image) => image.type === 'coverPoster');
  const { ref, focused } = useFocus<LightningViewElement>();

  return (
    <Column
      ref={ref}
      {...rest}
      style={{ ...style, scale: focused ? 1.2 : 1 }}
      transition={{ scale: { duration: 250 } }}
    >
      <lng-image
        src={getImageUrl(poster?.url ?? metadata.art)}
        style={{ width: 240 }}
      />

      <lng-text
        style={{
          fontSize: 25,
          lineHeight: 30,
          maxWidth: 250,
        }}
      >
        {metadata.title}
      </lng-text>
    </Column>
  );
};

HubItem.displayName = 'HubItem';
