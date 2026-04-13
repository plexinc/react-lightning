/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */
/* oxlint-disable typescript/no-explicit-any -- Valid use of any */

export default function mergeRefs(...refs: any[]) {
  const _len = refs.length;
  const args = Array.from<any>({ length: _len });

  for (let _key = 0; _key < _len; _key++) {
    args[_key] = refs[_key];
  }

  return function forwardRef(node: any): void {
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

export function useMergeRefs(...refs: any[]): (node: any) => void {
  return mergeRefs(...refs);
}
