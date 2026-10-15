import { useLayoutEffect, useRef, useState } from 'react';

export type ContentCross = {
  maxContentCross: number;
  crossGeneration: number;
  handleContentCrossLayout: (size: number) => void;
};

/**
 * Grow-only max of the cross size cells report, reset when `data` or
 * `extraData` identity changes. `crossGeneration` bumps on every reset so
 * mounted cells re-push their current cross and it climbs back.
 */
export function useContentCross(data: unknown, extraData: unknown): ContentCross {
  const [maxContentCross, setMaxContentCross] = useState(0);
  const maxContentCrossRef = useRef(0);
  const [crossGeneration, setCrossGeneration] = useState(0);
  const crossResetForRef = useRef({ data, extraData });

  // A data-identity change can be a recycle to a shorter row (cross must
  // shrink) or an in-place refresh keeping the same items (cross must NOT
  // collapse). Zero it, then bump the generation so every mounted cell
  // re-pushes its current cross: recycled cells report the new height,
  // refreshed cells report the same one, and grow-only settles on the real
  // max either way. Without the re-push a same-key refresh (mergeData) left
  // cross stuck at 0 and clipped taller-than-default content.
  // Layout effects also re-run when a Suspense boundary reveals the tree
  // again (a frozen screen coming back), so compare identities instead of
  // trusting the effect firing: a reset there drops cross to the default for
  // a pass and rows that leave the draw window keep the short size.
  useLayoutEffect(() => {
    const last = crossResetForRef.current;

    if (last.data === data && last.extraData === extraData) {
      return;
    }

    crossResetForRef.current = { data, extraData };
    maxContentCrossRef.current = 0;
    setMaxContentCross(0);
    setCrossGeneration((g) => g + 1);
  }, [data, extraData]);

  const handleContentCrossLayout = (size: number) => {
    if (size > maxContentCrossRef.current) {
      maxContentCrossRef.current = size;
      setMaxContentCross(size);
    }
  };

  return { maxContentCross, crossGeneration, handleContentCrossLayout };
}
