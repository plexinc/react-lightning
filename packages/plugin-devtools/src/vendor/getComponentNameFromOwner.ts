import type { Fiber } from 'react-reconciler';
import getComponentNameFromFiber from './getComponentNameFromFiber';

export function getComponentNameFromOwner(owner: Fiber): string | null {
  if (typeof owner.tag === 'number') {
    return getComponentNameFromFiber(owner);
  }

  if ('name' in owner && typeof owner.name === 'string') {
    return owner.name;
  }

  return null;
}
