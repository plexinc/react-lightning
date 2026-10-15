import { Activity } from 'react';
import { describe, expect, it } from 'vitest';

import { createTestRenderer } from './createTestRenderer';
import { type ContentCross, useContentCross } from './useContentCross';

function setup() {
  const { render, flush } = createTestRenderer();
  let current: ContentCross | undefined;

  function Probe({ data, extraData }: { data: unknown; extraData?: unknown }) {
    current = useContentCross(data, extraData);

    return null;
  }

  const renderList = (data: unknown, mode: 'visible' | 'hidden' = 'visible', extraData?: unknown) =>
    render(
      <Activity mode={mode}>
        <Probe data={data} extraData={extraData} />
      </Activity>,
    );

  const report = (size: number) => {
    // oxlint-disable-next-line typescript/no-non-null-assertion -- set by the first render
    current!.handleContentCrossLayout(size);
    flush();
  };

  // oxlint-disable-next-line typescript/no-non-null-assertion -- set by the first render
  return { renderList, report, latest: () => current! };
}

describe('useContentCross', () => {
  it('keeps the cross size when layout effects re-run without a data change', () => {
    const { renderList, report, latest } = setup();
    const data = [1, 2, 3];

    renderList(data);
    report(928);

    expect(latest().maxContentCross).toBe(928);
    const generation = latest().crossGeneration;

    // Hiding and revealing tears down and re-runs layout effects, the way a
    // Suspense-based freeze does when a covered screen comes back.
    renderList(data, 'hidden');
    renderList(data, 'visible');

    expect(latest().maxContentCross).toBe(928);
    expect(latest().crossGeneration).toBe(generation);
  });

  it('resets the cross size when data identity changes', () => {
    const { renderList, report, latest } = setup();

    renderList([1, 2, 3]);
    report(928);
    const generation = latest().crossGeneration;

    renderList([1, 2, 3]);

    expect(latest().maxContentCross).toBe(0);
    expect(latest().crossGeneration).toBe(generation + 1);
  });

  it('resets the cross size when extraData changes', () => {
    const { renderList, report, latest } = setup();
    const data = [1, 2, 3];

    renderList(data, 'visible', 'a');
    report(928);
    const generation = latest().crossGeneration;

    renderList(data, 'visible', 'b');

    expect(latest().maxContentCross).toBe(0);
    expect(latest().crossGeneration).toBe(generation + 1);
  });

  it('only grows within a dataset', () => {
    const { renderList, report, latest } = setup();
    const data = [1, 2, 3];

    renderList(data);
    report(928);
    report(672);

    expect(latest().maxContentCross).toBe(928);
  });
});
