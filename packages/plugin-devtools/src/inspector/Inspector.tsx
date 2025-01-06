import { onMessage } from 'webext-bridge/devtools';
import { MessagingProvider } from '../communication/MessagingProvider';
import { ResizableTwoPanelLayout } from '../components/ResizableTwoPanelLayout';
import { useTheme } from '../hooks/useTheme';
import { HoveredPreviewProvider } from '../preview/HoveredPreviewProvider';
import { SelectedPreviewProvider } from '../preview/SelectedPreviewProvider';
import { InspectorContent } from './InspectorContent';
import { InspectorOptionsProvider } from './InspectorOptions';
import { InspectorSidebar } from './InspectorSidebar';

export const Inspector = () => {
  const theme = useTheme();

  return (
    <MessagingProvider onMessage={onMessage}>
      <InspectorOptionsProvider>
        <SelectedPreviewProvider>
          <HoveredPreviewProvider>
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                display: 'flex',
                overflow: 'hidden',
                backgroundColor: theme.backgroundColor,
                color: theme.color,
                fontFamily: 'sans-serif',
                userSelect: 'none',
              }}
            >
              <ResizableTwoPanelLayout
                startChild={<InspectorContent />}
                endChild={<InspectorSidebar />}
                orientation="horizontal"
                defaultStartSize={75}
                storageKey="main_panel_size"
              />
            </div>
          </HoveredPreviewProvider>
        </SelectedPreviewProvider>
      </InspectorOptionsProvider>
    </MessagingProvider>
  );
};
