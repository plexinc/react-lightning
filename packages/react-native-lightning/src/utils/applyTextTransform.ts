import type { ReactNode } from 'react';
import type { TextStyle } from 'react-native';

function transformString(
  value: string,
  transform: TextStyle['textTransform'],
): string {
  switch (transform) {
    case 'uppercase':
      return value.toUpperCase();
    case 'lowercase':
      return value.toLowerCase();
    case 'capitalize':
      return value.replace(
        /(^|\s)(\S)/g,
        (_, lead, char) => lead + char.toUpperCase(),
      );
    default:
      return value;
  }
}

// Only string (or array-of-string) children are transformed; nested element
// children keep their own textTransform, matching the parity baseline.
export function applyTextTransform(
  children: ReactNode,
  transform: TextStyle['textTransform'],
): ReactNode {
  if (transform == null || transform === 'none') {
    return children;
  }

  if (typeof children === 'string') {
    return transformString(children, transform);
  }

  if (Array.isArray(children)) {
    return children.map((child) =>
      typeof child === 'string' ? transformString(child, transform) : child,
    );
  }

  return children;
}
