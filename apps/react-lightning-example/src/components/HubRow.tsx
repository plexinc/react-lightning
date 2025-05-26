import type { LightningViewElementProps } from '@plextv/react-lightning';
import { Column, Row } from '@plextv/react-lightning-components';
import type { Hub } from '../api/types/Hubs';
import { useHubItemsData } from '../api/useHubItemsData';
import { HubItem } from './HubItem';

type Props = LightningViewElementProps & {
  hub: Hub;
};

export const HubRow = (props: Props) => {
  const { hub, style, ...rest } = props;
  const { data, isLoading, error } = useHubItemsData(hub.key);

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

      <Row style={{ columnGap: 40 }}>
        {data.MediaContainer.Metadata.map((metadata, i) => (
          <HubItem
            key={metadata.guid}
            metadata={metadata}
            style={{
              initialDimensions: {
                x: i * 240,
                y: 0,
                width: 240,
                height: 360,
              },
            }}
          />
        ))}
      </Row>
    </Column>
  );
};
