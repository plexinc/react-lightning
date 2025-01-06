import { useCallback } from 'react';
import { useTheme } from '../hooks/useTheme';
import { InspectorButton } from '../inspector/InspectorButton';
import { getStorageKey } from '../utils/getStorageKey';
import { useLocalStorage } from '../utils/useLocalStorage';

type Tab = {
  name: string;
  id: string;
  content?: JSX.Element | (() => JSX.Element);
};

export const TabbedLayout = ({
  tabs,
  header = null,
  storageKey,
  children,
  onTabSelected,
}: {
  tabs: Tab[];
  header?: JSX.Element[] | null;
  storageKey: string;
  children?: JSX.Element;
  onTabSelected?: (tabId: string) => void;
}) => {
  const [selectedTab, setSelectedTab] = useLocalStorage(
    getStorageKey(storageKey),
    tabs[0]?.id,
  );
  const theme = useTheme();
  let selectedTabContent = tabs.find((tab) => tab.id === selectedTab)?.content;

  if (typeof selectedTabContent === 'function') {
    selectedTabContent = selectedTabContent();
  }

  const handleClick = useCallback(
    (tabId: string) => {
      if (tabId !== selectedTab) {
        setSelectedTab(tabId);
        onTabSelected?.(tabId);
      }
    },
    [selectedTab, setSelectedTab, onTabSelected],
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
      }}
    >
      <div
        style={{
          flex: `0 0 ${theme.toolbarHeight}px`,
          display: 'flex',
          flexDirection: 'row',
          width: '100%',
          height: `${theme.toolbarHeight}px`,
          background: theme.backgroundColor,
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        {tabs.map((tab) => (
          <InspectorButton
            key={tab.id}
            title={tab.name}
            value={tab.id}
            selected={selectedTab === tab.id}
            onClick={handleClick}
          />
        ))}

        <div
          style={{
            flex: '1 1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 8px',
          }}
        >
          {header}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          background: theme.backgroundColor,
          overflow: 'auto',
        }}
      >
        {selectedTabContent}
        {children}
      </div>
    </div>
  );
};
