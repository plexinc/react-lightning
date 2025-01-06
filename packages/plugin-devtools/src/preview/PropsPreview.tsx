import JsonView from '@uiw/react-json-view';
import { parse } from 'flatted';
import { type FC, useCallback, useState } from 'react';
import { useExtensionMessaging } from '../communication/useExtensionMessaging';
import { TabbedLayout } from '../components/TabbedLayout';
import { useTheme } from '../hooks/useTheme';
import type { SerializableProps } from '../plugin/getSerializableProps';

export const PropsPreview: FC = () => {
  const [props, setProps] = useState<SerializableProps | null>(null);
  const theme = useTheme();

  useExtensionMessaging(
    'elementProps',
    useCallback(({ data }) => {
      const serializedProps = parse(data);

      setProps(serializedProps);
    }, []),
  );

  if (!props) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          fontSize: '1.25rem',
        }}
      >
        No element Selected
      </div>
    );
  }

  return (
    <TabbedLayout
      tabs={[
        {
          name: 'Props (raw)',
          id: 'props-raw',
          content: (
            <JsonView
              value={props.rawProps}
              displayDataTypes={false}
              collapsed={2}
              style={theme.jsonViewer}
            />
          ),
        },
        {
          name: 'Props (post-transform)',
          id: 'props-transform',
          content: (
            <JsonView
              value={props.props}
              displayDataTypes={false}
              collapsed={2}
              style={theme.jsonViewer}
            />
          ),
        },
        {
          name: 'Lightning Node Props',
          id: 'lng-props',
          content: (
            <JsonView
              value={props.lngProps}
              displayDataTypes={false}
              collapsed={2}
              style={theme.jsonViewer}
            />
          ),
        },
        {
          name: 'Bounding Rect (parent relative)',
          id: 'rect',
          content: (
            <JsonView
              value={props.boundingRect}
              displayDataTypes={false}
              collapsed={2}
              style={theme.jsonViewer}
            />
          ),
        },
      ]}
      storageKey={'sidebar_panel'}
    />
  );
};
