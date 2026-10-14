import type { Transform } from '@plextv/react-lightning-plugin-flexbox';

import { writeCSSTransform } from './convertCSSTransformToLightning';

const transformPartRegex = /(\w+)\(([^)]+)\)/g;

export function parseTransform(transform?: string | object | Array<object | string>): Transform {
  return parseTransformInto({}, transform);
}

function parseTransformInto(
  transformResult: Transform,
  transform?: string | object | Array<object | string>,
): Transform {
  if (!transform) {
    return transformResult;
  }

  if (Array.isArray(transform)) {
    for (let i = 0; i < transform.length; i++) {
      parseTransformInto(transformResult, transform[i]);
    }

    return transformResult;
  }

  if (typeof transform === 'object') {
    const originalTranform = transform as Record<string, string | number | number[]>;

    for (const t in originalTranform) {
      const value = originalTranform[t];

      if (value != null) {
        writeCSSTransform(transformResult, t, value);
      }
    }

    return transformResult;
  }

  const transformParts = transform.match(transformPartRegex);

  if (!transformParts) {
    return transformResult;
  }

  for (const part of transformParts) {
    const [transformType, rawValue] = part.split('(');
    const transformValue = rawValue?.slice(0, -1);

    if (transformType == null || transformValue == null) {
      continue;
    }

    writeCSSTransform(transformResult, transformType, transformValue);
  }

  return transformResult;
}
