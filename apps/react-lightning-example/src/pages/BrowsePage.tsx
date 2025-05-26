import type { LightningElement } from '@plextv/react-lightning';
import { Column } from '@plextv/react-lightning-components';
import { useCallback, useState } from 'react';
import { useHubsData } from '../api/useHubsData';
import { HubRow } from '../components/HubRow';

export const BrowsePage = () => {
  const { data, error, isLoading } = useHubsData();
  const [verticalOffset, setVerticalOffset] = useState(0);

  const handleFocus = useCallback((element: LightningElement) => {
    setVerticalOffset(
      Math.min(0, -element.node.y - element.node.height / 2 + 1080 / 2),
    );
  }, []);

  if (isLoading) {
    return <lng-text>Loading...</lng-text>;
  }

  if (!data || error) {
    return <lng-text>There was an error loading the data</lng-text>;
  }

  return (
    <Column
      focusable
      style={{
        transform: { translateY: verticalOffset },
      }}
      transition={{ y: { duration: 250 } }}
    >
      {data.MediaContainer.Hub.map((hub, i) => (
        <HubRow
          key={hub.key}
          hub={hub}
          onFocus={handleFocus}
          style={{
            height: 550,
            width: 1920,
            initialDimensions: {
              x: 0,
              y: i * 550,
              width: 1920,
              height: 550,
            },
          }}
        />
      ))}
    </Column>
  );
};
