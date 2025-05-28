import type { Transform } from '@plextv/react-lightning-plugin-flexbox';
import { convertCSSTransformToLightning } from './convertCSSTransformToLightning';

const transformPartRegex = /(\w+)\(([^)]+)\)/g;

export function parseTransform(
  transform?: string | object | Array<object | string>,
): Transform {
  if (!transform) {
    return {};
  }

  if (Array.isArray(transform)) {
    const transforms = {};

    for (const t of transform) {
      Object.assign(transforms, parseTransform(t));
    }

    return transforms;
  }

  if (typeof transform === 'object') {
    const safeTransform: Transform = {};
    const originalTranform = transform as Record<
      string,
      string | number | number[]
    >;

    for (const t of Object.keys(originalTranform)) {
      if (!originalTranform[t]) {
        continue;
      }

      Object.assign(
        safeTransform,
        convertCSSTransformToLightning(t, originalTranform[t]),
      );
    }

    return safeTransform;
  }

  const transformParts = transform.match(transformPartRegex);
  const transformResult: Transform = {};

  if (!transformParts) {
    return transformResult;
  }

  for (const part of transformParts) {
    const [transformType, rawValue] = part.split('(');
    const transformValue = rawValue?.slice(0, -1);

    if (transformType == null || transformValue == null) {
      continue;
    }

    Object.assign(
      transformResult,
      convertCSSTransformToLightning(transformType, transformValue),
    );
  }

  return transformResult;
}
