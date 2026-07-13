import type { Transform } from '@plextv/react-lightning-plugin-flexbox';

import { convertRotationValue } from './convertRotationValue';

// translateX/Y accept a percentage string (of the node's own size, resolved at
// layout readback) or pixels. parseInt would silently drop the % and treat the
// number as px, mispositioning the node.
function parseTranslateValue(value: string | number): number | `${number}%` {
  if (typeof value === 'number') {
    return value;
  }

  const trimmed = value.trim();

  return trimmed.endsWith('%')
    ? (trimmed as `${number}%`)
    : Number.parseInt(trimmed, 10);
}

function getXYTranslate(
  value: string | number | number[],
): [number | `${number}%`, number | `${number}%`] {
  if (Array.isArray(value)) {
    const x = value[0] ?? 0;

    return [x, value[1] ?? x];
  }

  if (typeof value === 'number') {
    return [value, value];
  }

  const [xString, yString] = value.split(',');
  const x = xString != null ? parseTranslateValue(xString) : 0;

  return [x, yString == null ? x : parseTranslateValue(yString)];
}

function getValue(
  value: string | number | number[],
  defaultValue: number,
  stringConverter: (stringValue: string) => number,
): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return stringConverter(value);
  }

  return value[0] ?? defaultValue;
}

function getXYValue(
  value: string | number | number[],
  defaultValue: number,
  stringConverter: (stringValue: string) => number,
): [number, number] {
  let x: number;
  let y: number;

  if (Array.isArray(value)) {
    x = value[0] ?? defaultValue;
    y = value[1] ?? x;
  } else if (typeof value === 'number') {
    x = y = value;
  } else {
    const [xString, yString] = value.split(',');

    x = xString != null ? stringConverter(xString) : 0;
    y = yString == null ? x : stringConverter(yString);
  }

  return [x ?? defaultValue, y ?? defaultValue];
}

export function convertCSSTransformToLightning(
  transformType: string,
  transformValue: string | number | number[] | Record<string, number | string | number[]>,
): Transform {
  const transformResult: Transform = {};

  if (typeof transformValue === 'object') {
    for (const key in transformValue) {
      const value = (transformValue as Record<string, number | string | number[]>)[key];

      if (value != null) {
        const result = convertCSSTransformToLightning(key, value);

        Object.assign(transformResult, result);
      }
    }

    return transformResult;
  }

  switch (transformType) {
    case 'translate':
      {
        const [x, y] = getXYTranslate(transformValue);

        transformResult.translateX = x;
        transformResult.translateY = y;
      }
      break;
    case 'translateX':
      transformResult.translateX = parseTranslateValue(
        transformValue as string | number,
      );
      break;
    case 'translateY':
      transformResult.translateY = parseTranslateValue(
        transformValue as string | number,
      );
      break;
    case 'scale':
      {
        const [x, y] = getXYValue(transformValue, 0, Number.parseFloat);

        transformResult.scaleX = x;
        transformResult.scaleY = y;
      }
      break;
    case 'scaleX':
      transformResult.scaleX = getValue(transformValue, 1, Number.parseFloat);
      break;
    case 'scaleY':
      transformResult.scaleY = getValue(transformValue, 1, Number.parseFloat);
      break;
    case 'rotate':
    case 'rotation':
      transformResult.rotation = getValue(transformValue, 0, convertRotationValue);
      break;
  }

  return transformResult;
}
