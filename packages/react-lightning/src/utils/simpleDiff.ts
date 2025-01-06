import dedupeArray from './dedupeArray';

function areEqual<T>(first: T, second: T, visited: Set<unknown>): boolean {
  if (first === second) {
    return true;
  }
  if (visited.has(first) || visited.has(second)) {
    return first === second;
  }
  if (Array.isArray(first) && Array.isArray(second)) {
    visited.add(first);
    visited.add(second);
    return areEqualArrays(first, second, visited);
  }
  if (
    typeof first === 'object' &&
    typeof second === 'object' &&
    !isReactElement(first) &&
    !isReactElement(second)
  ) {
    visited.add(first);
    visited.add(second);
    return areEqualObjects(first as object, second as object, visited);
  }
  return first === second;
}

function areEqualArrays<T>(
  first: T[],
  second: T[],
  visited: Set<unknown>,
): boolean {
  return (
    first.length === second.length &&
    first.every((item, i) => areEqual(item, second[i], visited))
  );
}

function areEqualObjects<T extends object>(
  first: T,
  second: T,
  visited: Set<unknown>,
): boolean {
  if ((first == null && second == null) || typeof first !== 'object') {
    return first === second;
  }

  const allKeys = dedupeArray(
    Object.keys(first).concat(Object.keys(second)),
  ) as (keyof T)[];

  return allKeys.every((key) => {
    return areEqual(first[key], second[key], visited);
  });
}

// biome-ignore lint/suspicious/noExplicitAny: TODO
function isReactElement(child: any): boolean {
  return child?.$$typeof === Symbol.for('react.element');
}

/**
 * Returns an object that only has the properties that contain differences from
 * the original object. Only does a shallow compare, except for arrays, where
 * array items are recursively compared
 */
export function simpleDiff<T extends object>(
  first: T,
  second: T,
  options?: { ignore?: (keyof T)[] },
): Partial<T> | null {
  if (first === second) {
    return null;
  }

  const visited = new Set<unknown>();
  const allKeys = dedupeArray(
    Object.keys(first).concat(Object.keys(second)),
  ) as (keyof T)[];
  let hasDiffs = false;

  const diffs = allKeys.reduce(
    (acc, key) => {
      if (
        !options?.ignore?.includes(key) &&
        !(isReactElement(first[key]) || isReactElement(second[key])) &&
        !areEqual(first[key], second[key], visited)
      ) {
        acc[key] = second[key];
        hasDiffs = true;
      }

      return acc;
    },
    {} as Partial<T>,
  );

  return hasDiffs ? diffs : null;
}
