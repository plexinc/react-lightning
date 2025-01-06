import { ResizableTwoPanelLayout } from '../components/ResizableTwoPanelLayout';
import { ElementPreview } from '../preview/ElementPreview';
import { HoveredPreviewProvider } from '../preview/HoveredPreviewProvider';
import { PropsPreview } from '../preview/PropsPreview';
import { SelectedPreviewProvider } from '../preview/SelectedPreviewProvider';

export const InspectorSidebar = () => {
  return (
    <HoveredPreviewProvider>
      <SelectedPreviewProvider>
        <ResizableTwoPanelLayout
          startChild={<ElementPreview />}
          endChild={<PropsPreview />}
          orientation="vertical"
          defaultStartSize={25}
          storageKey="sidebar_panel_size"
        />
      </SelectedPreviewProvider>
    </HoveredPreviewProvider>
  );
};
