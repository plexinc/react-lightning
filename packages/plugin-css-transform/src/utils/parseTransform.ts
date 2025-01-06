import type { Transform } from '@plex/react-lightning-plugin-flexbox';
import { convertCSSTransformToLightning } from './convertCSSTransformToLightning';

const transformPartRegex = /(\w+)\(([^)]+)\)/g;

export function parseTransform(transform?: string): Transform {
  if (!transform) {
    return {};
  }

  if (typeof transform === 'object') {
    return transform;
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
