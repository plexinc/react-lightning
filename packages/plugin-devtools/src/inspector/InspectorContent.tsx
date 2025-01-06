import { useCallback, useMemo, useState } from 'react';
import { PanelWithToolbar } from '../components/PanelWithToolbar';
import { LightningTree } from '../panels/lightning/LightningTree';
import type { LightningTreeFilter } from '../panels/lightning/LightningTreeFilter';
import { useElementTreeContext } from '../store/useElementTreeContext';
import { useInspectorOption } from './InspectorOptions';

export const InspectorContent = () => {
  const tree = useElementTreeContext();
  const [alwaysShowIds, setAlwaysShowIds] = useInspectorOption('alwaysShowIds');
  const [onlyShowFocusables, setOnlyShowFocusables] =
    useInspectorOption('onlyShowFocusables');
  const [onlyShowFocused, setOnlyShowFocused] =
    useInspectorOption('onlyShowFocused');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const handleOnlyShowFocusablesChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setOnlyShowFocusables(event.target.checked);
    },
    [setOnlyShowFocusables],
  );

  const handleOnlyShowFocusedChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setOnlyShowFocused(event.target.checked);
    },
    [setOnlyShowFocused],
  );

  const handleAlwaysShowIdsChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setAlwaysShowIds(event.target.checked);
    },
    [setAlwaysShowIds],
  );

  const handleInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(event.target.value);
    },
    [],
  );

  const filter = useMemo(
    () =>
      JSON.stringify({
        searchTerm,
        onlyShowFocusables,
        onlyShowFocused,
      } as LightningTreeFilter),
    [searchTerm, onlyShowFocusables, onlyShowFocused],
  );

  return (
    <PanelWithToolbar
      toolbar={
        <div style={{ display: 'flex' }}>
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={handleInput}
          />

          <label key="onlyShowFocusables">
            <input
              type="checkbox"
              checked={onlyShowFocusables}
              onChange={handleOnlyShowFocusablesChange}
            />
            <span>Only Show Focusables</span>
          </label>

          <label key="onlyShowFocused">
            <input
              type="checkbox"
              checked={onlyShowFocused}
              onChange={handleOnlyShowFocusedChange}
            />
            <span>Only Show Focused</span>
          </label>

          <label key="alwaysShowIdsOption">
            <input
              type="checkbox"
              checked={alwaysShowIds}
              onChange={handleAlwaysShowIdsChange}
            />
            <span>Always show IDs</span>
          </label>
        </div>
      }
    >
      {tree ? <LightningTree tree={tree} filter={filter} /> : null}
    </PanelWithToolbar>
  );
};
