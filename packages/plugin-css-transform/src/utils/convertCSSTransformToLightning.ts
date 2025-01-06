import type { Transform } from '@plex/react-lightning-plugin-flexbox';
import { convertRotationValue } from './convertRotationValue';

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
  transformValue:
    | string
    | number
    | number[]
    | Record<string, number | string | number[]>,
) {
  const transformResult: Transform = {};

  if (typeof transformValue === 'object') {
    for (const key in transformValue) {
      const value = (
        transformValue as Record<string, number | string | number[]>
      )[key];

      if (value) {
        const result = convertCSSTransformToLightning(key, value);

        Object.assign(transformResult, result);
      }
    }

    return transformResult;
  }

  switch (transformType) {
    case 'translate':
      {
        const [x, y] = getXYValue(transformValue, 0, Number.parseInt);

        transformResult.translateX = x;
        transformResult.translateY = y;
      }
      break;
    case 'translateX':
      transformResult.translateX = getValue(transformValue, 0, Number.parseInt);
      break;
    case 'translateY':
      transformResult.translateY = getValue(transformValue, 0, Number.parseInt);
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
      transformResult.rotation = getValue(
        transformValue,
        0,
        convertRotationValue,
      );
      break;
  }

  return transformResult;
}
