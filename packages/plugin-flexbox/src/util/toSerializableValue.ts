function isPrimitiveValue(
  valueType:
    | 'string'
    | 'number'
    | 'bigint'
    | 'boolean'
    | 'symbol'
    | 'undefined'
    | 'object'
    | 'function',
): boolean {
  return (
    valueType === 'string' ||
    valueType === 'number' ||
    valueType === 'boolean' ||
    valueType === 'bigint'
  );
}

// biome-ignore lint/suspicious/noExplicitAny: Any value can be passed in
export function toSerializableValue<T>(key: string, value: any): T | null {
  const valueType = typeof value;

  if (isPrimitiveValue(valueType)) {
    return value as T;
  } else if (valueType === 'object') {
    // Only transforms can be objects
    if (key === 'transform') {
      return value as T;
    } else if ('current' in value && isPrimitiveValue(typeof value.current)) {
      // ...unless it's a reanimated animation. Unfortunately, there's no real
      // good way to serialize animations. There's also no real good way to
      // keep this logic in the reanimated plugin, so we'll just have to do it
      // here.
      return value.current as T;
    }

    return null;
  }

  return null;
}
