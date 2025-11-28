import type {
  LightningElement,
  LightningViewElementProps,
} from '@plextv/react-lightning';
import { Column, Row } from '@plextv/react-lightning-components';
import { type FC, useCallback, useState } from 'react';
import type { Hub } from '../api/types/Hubs';
import { useHubItemsData } from '../api/useHubItemsData';
import { HubItem } from './HubItem';

type Props = LightningViewElementProps & {
  hub: Hub;
};

export const HubRow: FC<Props> = (props) => {
  const { hub, style, ...rest } = props;
  const { data, isLoading, error } = useHubItemsData(hub.key);
  const [horizontalOffset, setHorizontalOffset] = useState(0);

  const handleFocus = useCallback((element: LightningElement) => {
    setHorizontalOffset(
      Math.min(0, -element.node.x - element.node.w / 2 + 1920 / 2),
    );
  }, []);

  if (isLoading) {
    return (
      <lng-view style={style}>
        <lng-text>Loading...</lng-text>
      </lng-view>
    );
  }

  if (!data || error) {
    return (
      <lng-view style={style}>
        <lng-text>There was an error loading the hub</lng-text>
      </lng-view>
    );
  }

  return (
    <Column {...rest} style={style} focusable>
      <lng-text
        style={{
          fontSize: 40,
          lineHeight: 50,
          marginBottom: 20,
        }}
      >
        {hub.title}
      </lng-text>

      <Row
        style={{
          columnGap: 40,
          x: horizontalOffset,
          // Ensure the row grows so it stays on screen when rendering instead
          // of getting clipped. This is just a quick fix; a better solution would
          // involve things like virtualization and component recycling
          w: -horizontalOffset + 1920,
        }}
        transition={{ x: { duration: 250 } }}
      >
        {data.MediaContainer.Metadata.map((metadata, i) => (
          <HubItem
            key={metadata.guid}
            metadata={metadata}
            onFocus={handleFocus}
            style={{
              initialDimensions: {
                x: i * 240,
                y: 0,
                w: 240,
                h: 360,
              },
            }}
          />
        ))}
      </Row>
    </Column>
  );
};
