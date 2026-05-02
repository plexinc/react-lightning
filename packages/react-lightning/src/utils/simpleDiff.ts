const REACT_ELEMENT_TYPE = Symbol.for('react.element');
const REACT_TRANSITIONAL_ELEMENT_TYPE = Symbol.for('react.transitional.element');

// This is a list of properties that should be deeply compared, specifically for
// React elements.
const DEEP_PROPS = ['style'];

interface ReactElement {
  $$typeof: symbol;
  type: unknown;
  props: unknown;
}

function isReactElement(value: unknown): value is ReactElement {
  return (
    typeof value === 'object' &&
    value !== null &&
    ((value as ReactElement).$$typeof === REACT_ELEMENT_TYPE ||
      (value as ReactElement).$$typeof === REACT_TRANSITIONAL_ELEMENT_TYPE)
  );
}

function areValuesEqual(first: unknown, second: unknown): boolean {
  // Strict equality check for primitives and same references
  if (first === second) {
    return true;
  }

  // Handle null/undefined cases
  if (first == null || second == null) {
    return first === second;
  }

  // Handle functions - compare by reference only
  if (typeof first === 'function' && typeof second === 'function') {
    return first === second;
  }

  // Handle arrays
  if (Array.isArray(first) && Array.isArray(second)) {
    if (first.length !== second.length) {
      return false;
    }

    for (let i = 0; i < first.length; i++) {
      if (!areValuesEqual(first[i], second[i])) {
        return false;
      }
    }

    return true;
  }

  // Handle React elements - compare props
  if (isReactElement(first) && isReactElement(second)) {
    if (first.type !== second.type) {
      return false;
    }

    return areValuesEqual(first.props, second.props);
  }

  // Handle objects - reference check already done above, so do shallow comparison
  if (typeof first === 'object' && typeof second === 'object') {
    if (first instanceof Date && second instanceof Date) {
      return first.getTime() === second.getTime();
    }

    // Count keys and compare in a single pass without allocating arrays
    let firstKeyCount = 0;

    for (const key in first as Record<string, unknown>) {
      firstKeyCount++;
      const firstValue = (first as Record<string, unknown>)[key];
      const secondValue = (second as Record<string, unknown>)[key];

      if (!(key in second) || firstValue !== secondValue) {
        if (DEEP_PROPS.includes(key)) {
          if (!areValuesEqual(firstValue, secondValue)) {
            return false;
          }
        } else {
          return false;
        }
      }
    }

    // Ensure second doesn't have extra keys
    let secondKeyCount = 0;

    for (const _ in second as Record<string, unknown>) {
      secondKeyCount++;

      if (secondKeyCount > firstKeyCount) {
        return false;
      }
    }

    return firstKeyCount === secondKeyCount;
  }

  // For all other cases (primitives of different types), they're not equal
  return false;
}

/**
 * A diffing function that takes two objects and returns the difference between
 * them. The second object is mutated and will only contain the properties that
 * are different from the first object, or null if the objects are the same.
 * Equality between the object properties are checked using the following rules:
 * - If the values are primitives, then values are compared using strict
 *   equality.
 * - If the values are arrays, then each item of the array is compared again
 *   using this function.
 * - If the values are functions, then their references are compared.
 * - If the values are React elements, then their props are compared using this
 *   function.
 * - If the values are objects, then a reference equality check is performed
 *   first, and if they are not equal, a shallow comparison is made.
 *
 * Note, Symbols as keys are not supported, and will be ignored.
 */
export function simpleDiff<T extends object>(first: T, second: T): Partial<T> | null {
  // If objects are referentially equal, return null
  if (first === second) {
    return null;
  }

  const secondCopy = { ...second };
  let hasDiffs = false;
  let firstKeyCount = 0;

  for (const key in first) {
    firstKeyCount++;
    const firstValue = first[key as keyof T];
    const secondHasKey = key in secondCopy;
    const secondValue = secondCopy[key as keyof T];

    // If key doesn't exist in second object, it's a difference - already undefined in second
    if (!secondHasKey) {
      hasDiffs = true;
      continue;
    }

    // Compare values based on their types
    if (areValuesEqual(firstValue, secondValue)) {
      // Values are equal, so remove this property from second
      delete secondCopy[key as keyof T];
    } else {
      // Values are different, keep the property in second
      hasDiffs = true;
    }
  }

  // Check for keys that are only in the second object
  if (!hasDiffs) {
    let secondKeyCount = 0;

    for (const _ in second) {
      secondKeyCount++;

      if (secondKeyCount > firstKeyCount) {
        hasDiffs = true;
        break;
      }
    }
  }

  return hasDiffs ? secondCopy : null;
}
