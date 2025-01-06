import { Direction } from '../focus/Direction';
import type { LightningElement } from '../types';

type Dimensions = {
  width: number;
  height: number;
  x: number;
  y: number;
  centerX: number;
  centerY: number;
};

/**
 * Distance is calculated from the center of the source, to the center of the
 * closest edge of the target based on the direction. This is because if we only
 * calculate the centers of source and target, something really tall/wide could
 * be mistaken as a further element than it really is. For example:
 *
 * ╔═════════════════╗
 * ║        1        ║
 * ╠═════════════╦═══╣
 * ║             ║ 3 ║
 * ║             ╠═══╣
 * ║      2      ║   ║
 * ║             ║ 4 ║
 * ╚═════════════╩═══╝
 *
 *  If (1) is our source, and we're looking for the closest element downwards,
 *  we would expect (2) to be the closest element, but if we calculate using the
 *  centers of elements of (2) and (3), (3) would be closer.
 */
function getDistance(
  direction: Direction,
  source: Dimensions,
  target: Dimensions,
): number | null {
  let targetX: number;
  let targetY: number;

  switch (direction) {
    case Direction.Up:
      targetX = target.centerX;
      targetY = target.y + target.height;

      if (targetY > source.centerY) {
        return null;
      }

      break;
    case Direction.Right:
      targetX = target.x;
      targetY = target.centerY;

      if (targetX < source.centerX) {
        return null;
      }

      break;
    case Direction.Down:
      targetX = target.centerX;
      targetY = target.y;

      if (targetY < source.centerY) {
        return null;
      }

      break;
    case Direction.Left:
      targetX = target.x + target.width;
      targetY = target.centerY;

      if (targetX > source.centerX) {
        return null;
      }

      break;
    default:
      return null;
  }

  const x = source.centerX - targetX;
  const y = source.centerY - targetY;

  // We should use pythagoras to find the distance between the two points:
  //    Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2))
  // but since we don't need to get the actual length, we can simplify the
  // equation for performance since we only care about the relative distances.
  // We still need to get the absolute value though since distance cannot be
  // negative. In chrome, multiplying the number to itself is faster than
  // using Math.pow or Math.abs, so we'll do that here.
  return x * x + y * y;
}

function isOverlap(
  { x: x1, y: y1, width: w1, height: h1 }: Dimensions,
  { x: x2, y: y2, width: w2, height: h2 }: Dimensions,
) {
  return {
    x: x1 < x2 + w2 && x1 + w1 > x2,
    y: y1 < y2 + h2 && y1 + h1 > y2,
  };
}

function getDimensions(
  element: LightningElement,
  relativeElement: LightningElement | null,
): Dimensions {
  const { width, height } = element.node;
  const { x, y } = element.getRelativePosition(relativeElement);
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  return { width, height, x, y, centerX, centerY };
}

export function findClosestElement(
  sourceElement: LightningElement,
  elementsToCheck: Iterable<LightningElement>,
  parentElement: LightningElement | null,
  direction: Direction,
): LightningElement | null {
  let closest: LightningElement[] = [];
  let closestDistance = Number.MAX_VALUE;

  const sourceDimensions = getDimensions(sourceElement, parentElement);

  for (const otherElement of elementsToCheck) {
    if (otherElement.focusable && otherElement !== sourceElement) {
      const otherDimensions = getDimensions(otherElement, parentElement);
      const { x: isOverlappedX, y: isOverlappedY } = isOverlap(
        sourceDimensions,
        otherDimensions,
      );

      const distance = getDistance(
        direction,
        sourceDimensions,
        otherDimensions,
      );

      if (distance === null) {
        continue;
      }

      const isHorizontal = direction & Direction.Horizontal;
      const isOverlapped = isHorizontal ? isOverlappedY : isOverlappedX;

      if (distance < closestDistance && isOverlapped) {
        closest = [otherElement];
        closestDistance = distance;
      } else if (distance === closestDistance) {
        closest?.push(otherElement);
      }
    }
  }

  if (closest.length === 0) {
    return null;
  }

  if (closest.length === 1) {
    return closest[0] as LightningElement;
  }

  // If we have multiple elements with the same closeness, then try to pick the
  // next element in the render tree. This may not be the same order as the
  // `elementsToCheck` array.
  const singleClosest = findClosestNodeInTree(sourceElement, closest);

  return singleClosest ?? (closest[0] as LightningElement);
}

function findClosestNodeInTree(
  targetNode: LightningElement,
  nodesToCheck: LightningElement[],
): LightningElement | null {
  if (nodesToCheck.length === 1) {
    return nodesToCheck[0] as LightningElement;
  }

  if (nodesToCheck.length === 0) {
    return null;
  }

  // `ancestors` will contain the ordered list of ancestors of the target node.
  // If any of the nodes in `nodesToCheck` have a matching ancestor, the winner
  // is the node that has the smallest index in the set.
  const ancestors: LightningElement[] = [];
  let curr = targetNode.parent;

  while (curr) {
    ancestors.push(curr);
    curr = curr.parent;
  }

  const ancestorsSet = new Set<LightningElement>(ancestors);

  let closest: LightningElement | null = null;
  let closestIndex = Number.MAX_VALUE;

  for (const element of nodesToCheck) {
    curr = element.parent;

    while (curr) {
      if (ancestorsSet.has(curr)) {
        const index = ancestors.indexOf(curr);

        if (index < closestIndex) {
          closest = element;
          closestIndex = index;
        }

        break;
      }

      curr = curr.parent;
    }
  }

  return closest;
}
