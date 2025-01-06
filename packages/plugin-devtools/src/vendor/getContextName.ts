import type { ReactContext } from 'react-reconciler';

export function getContextName<T>(
  type: ReactContext<T> | { _context: ReactContext<T> },
) {
  const context = '_context' in type ? type._context : type;

  return context.displayName || 'Context';
}
