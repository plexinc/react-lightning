/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */
/** biome-ignore-all lint/suspicious/noExplicitAny: Valid use of any */

import * as React from 'react';

export default function mergeRefs(...refs: any[]) {
  const _len = refs.length;
  const args = Array.from<any>({ length: _len });

  for (let _key = 0; _key < _len; _key++) {
    args[_key] = refs[_key];
  }

  return function forwardRef(node: any) {
    for (const ref of args) {
      if (ref == null) {
        continue;
      }
      if (typeof ref === 'function') {
        ref(node);
        continue;
      }
      if (typeof ref === 'object') {
        ref.current = node;
        continue;
      }
      console.error(
        `mergeRefs cannot handle Refs of type boolean, number or string, received ref ${String(ref)}`,
      );
    }
  };
}

export function useMergeRefs(...refs: any[]) {
  const _len = refs.length;
  const args = Array.from({ length: _len });
  for (let _key = 0; _key < _len; _key++) {
    args[_key] = refs[_key];
  }
  return React.useMemo(() => mergeRefs(...args), [args]);
}
