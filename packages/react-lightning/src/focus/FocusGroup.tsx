import {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useCombinedRef } from '../hooks/useCombinedRef';
import { Keys } from '../input/Keys';
import type { LightningElement, LightningViewElementProps } from '../types';
import type { KeyEvent } from '../types';
import { findClosestElement } from '../utils/findClosestElement';
import { Direction } from './Direction';
import { FocusGroupContext } from './FocusGroupContext';
import { FocusPathContext } from './FocusPathProvider';
import type { Traps } from './Traps';
import { useFocus } from './useFocus';

export interface FocusGroupProps extends LightningViewElementProps {
  autoFocus?: boolean;
  disable?: boolean;
  trapFocusUp?: boolean;
  trapFocusRight?: boolean;
  trapFocusDown?: boolean;
  trapFocusLeft?: boolean;
  focusedStyle?: LightningViewElementProps['style'];
  onChildFocused?: (child: LightningElement) => void;
}

function isFlexElement(node?: LightningElement | null) {
  return node && 'display' in node.style && node.style.display === 'flex';
}

export const FocusGroup = forwardRef<LightningElement, FocusGroupProps>(
  (
    {
      autoFocus = false,
      disable,
      trapFocusUp,
      trapFocusRight,
      trapFocusDown,
      trapFocusLeft,
      style,
      focusedStyle,
      onKeyDown,
      onChildFocused,
      ...otherProps
    },
    ref,
  ) => {
    const { focusPair, getFocusPath } = useContext(FocusPathContext);
    const { focused: parentFocused } = useContext(FocusGroupContext);
    const [hasFocusableChildren, setHasFocusableChildren] = useState(false);
    const { ref: focusRef, focused } = useFocus({
      autoFocus,
      active: hasFocusableChildren && !disable,
      trapFocusUp,
      trapFocusRight,
      trapFocusDown,
      trapFocusLeft,
    });
    const initialRenderRef = useRef<boolean>(true);
    const focusedChild = useRef<LightningElement | null>(null);
    const elementsRef = useRef<Set<LightningElement>>(new Set());
    const combinedRef = useCombinedRef(ref, focusRef);
    const trapsRef = useRef<Map<LightningElement, Traps>>(new Map());
    const disposers = useRef<Map<number, Array<() => void>>>(new Map());

    const getNextChild = useCallback((element?: LightningElement) => {
      const elements = Array.from(elementsRef.current);
      // -1 because we +1 in the loop below
      const index = element ? elements.indexOf(element) : -1;
      let nextChild: LightningElement | undefined;

      for (let i = index + 1; i < elements.length; i++) {
        nextChild = elements[i];

        if (nextChild?.focusable) {
          break;
        }
      }

      if (!nextChild?.focusable) {
        for (let i = index - 1; i >= 0; i--) {
          nextChild = elements[i];

          if (nextChild?.focusable) {
            break;
          }
        }
      }

      return nextChild?.focusable ? nextChild : null;
    }, []);

    const focusChild = useCallback(
      (child: LightningElement) => {
        let nextChild: LightningElement | null = child;

        if (!child.focusable) {
          nextChild = getNextChild(child);
        }

        if (!nextChild) {
          return;
        }

        focusedChild.current = nextChild;

        if (focusRef.current) {
          focusPair(focusRef.current, nextChild);
        }

        onChildFocused?.(nextChild);
      },
      [focusPair, focusRef, onChildFocused, getNextChild],
    );

    const updateHasFocusableChildren = useCallback(() => {
      setHasFocusableChildren(
        Array.from(elementsRef.current).some((element) => element.focusable),
      );
    }, []);

    const calculateElementSize = useCallback(() => {
      const el = focusRef.current;

      if (!el || elementsRef.current.size === 0) {
        return;
      }

      const elStyle = el.style;

      if (!isFlexElement(el)) {
        // If we have a focus group that's not laid out with flex, we need to
        // set the size to the area occupied by the children for proper
        // navigation.
        const children = Array.from(elementsRef.current);
        const bounds = children.reduce(
          (acc, child) => {
            const { x, y, width, height } = child.getBoundingClientRect(el);

            return {
              width: elStyle.width ?? Math.max(acc.width, x + width),
              height: elStyle.height ?? Math.max(acc.height, y + height),
            };
          },
          {
            width: elStyle.width ?? Number.MIN_SAFE_INTEGER,
            height: elStyle.height ?? Number.MIN_SAFE_INTEGER,
          },
        );

        el.setNodeProp('width', bounds.width);
        el.setNodeProp('height', bounds.height);
      }
    }, [focusRef]);

    const createUpdateFocusedChildHandler = useCallback(
      (child: LightningElement) => (isFocused: boolean) => {
        if (!isFocused) {
          return;
        }

        focusedChild.current = child;

        // The focus path might not contain this child (e.g. calling focus()
        // directly on a component) so we need to call focusPair to add it.
        const focusPath = getFocusPath();

        if (!focusPath.includes(child)) {
          focusChild(child);
        }
      },
      [getFocusPath, focusChild],
    );

    const addChild = useCallback(
      (element: LightningElement) => {
        if (elementsRef.current.size === 0) {
          focusedChild.current = element;

          if (focusRef.current) {
            focusPair(focusRef.current, element);
          }
        }

        elementsRef.current.add(element);
        focusRef.current?.emit('focusChildAdded', element);

        const childDisposables = [
          element.on('focusableChanged', updateHasFocusableChildren),
          element.on('focusChanged', createUpdateFocusedChildHandler(element)),
        ];

        if (!isFlexElement(focusRef.current)) {
          childDisposables.push(
            element.on('propsChanged', (props) => {
              if (
                'width' in props ||
                'height' in props ||
                'x' in props ||
                'y' in props
              ) {
                calculateElementSize();
              }
            }),
          );
        }

        disposers.current.set(element.id, childDisposables);
        updateHasFocusableChildren();
        calculateElementSize();
      },
      [
        focusPair,
        focusRef,
        updateHasFocusableChildren,
        calculateElementSize,
        createUpdateFocusedChildHandler,
      ],
    );

    const removeChild = useCallback(
      (element: LightningElement) => {
        // If the child we remove is the focused child, we need to set the next
        // child to be the focused child.
        if (focusedChild.current === element) {
          const nextChild = getNextChild(element);

          focusedChild.current = nextChild ?? null;

          if (focusRef.current && nextChild) {
            focusPair(focusRef.current, nextChild);
          }
        }

        elementsRef.current.delete(element);

        for (const disposer of disposers.current.get(element.id) ?? []) {
          disposer();
        }

        disposers.current.delete(element.id);
        focusRef.current?.emit('focusChildRemoved', element);
        updateHasFocusableChildren();
        calculateElementSize();
      },
      [
        focusPair,
        focusRef,
        getNextChild,
        updateHasFocusableChildren,
        calculateElementSize,
      ],
    );

    const updateTraps = useCallback(
      (element: LightningElement, traps: Traps) => {
        trapsRef.current.set(element, traps);
      },
      [],
    );

    const finalStyle = useMemo(
      () => ({ ...style, ...(focused ? focusedStyle : undefined) }),
      [style, focused, focusedStyle],
    );

    const handleFocusKeyDown = useCallback(
      (event: KeyEvent) => {
        let direction: Direction;

        switch (event.remoteKey) {
          case Keys.Left:
            direction = Direction.Left;
            break;
          case Keys.Right:
            direction = Direction.Right;
            break;
          case Keys.Up:
            direction = Direction.Up;
            break;
          case Keys.Down:
            direction = Direction.Down;
            break;
          default:
            return onKeyDown?.(event);
        }

        return tryFocusNext(direction);
      },
      [onKeyDown],
    );

    useEffect(() => {
      if (hasFocusableChildren && !focusedChild.current) {
        focusedChild.current = getNextChild();
      }
    }, [hasFocusableChildren, getNextChild]);

    useEffect(() => {
      if ((autoFocus && initialRenderRef.current) || focused) {
        if (!focusedChild.current) {
          return;
        }

        if (!focusedChild.current.focusable) {
          focusedChild.current = getNextChild(focusedChild.current) ?? null;
        }

        if (focusedChild.current && !focusedChild.current.focused) {
          focusChild(focusedChild.current);
        }
      }
    }, [autoFocus, focused, getNextChild, focusChild]);

    useEffect(() => {
      if (focusRef.current) {
        focusRef.current.isFocusGroup = true;
      }
    }, [focusRef]);

    useEffect(() => {
      initialRenderRef.current = false;
    }, []);

    // Returns false if focus works, to stop the propagation of the key event.
    // If there's nothing to navigate to, return true and let the event bubble
    // up to be handled by the next focus group.
    function tryFocusNext(direction: Direction): boolean {
      if (!focusRef.current?.focusable || !focusedChild.current) {
        return true;
      }

      if (trapsRef.current.has(focusedChild.current)) {
        const traps = trapsRef.current.get(focusedChild.current);

        if (traps) {
          if (
            (direction === Direction.Left && traps.left) ||
            (direction === Direction.Right && traps.right) ||
            (direction === Direction.Up && traps.up) ||
            (direction === Direction.Down && traps.down)
          ) {
            // Don't bubble up
            return false;
          }
        }
      }

      const closestElement = findClosestElement(
        focusedChild.current,
        elementsRef.current,
        focusRef.current,
        direction,
      );

      if (closestElement) {
        focusChild(closestElement);
        return false;
      }

      return true;
    }

    return (
      <FocusGroupContext.Provider
        value={{
          focused: focused && parentFocused,
          focusedChild: focusedChild.current,
          updateTraps,
          addChild,
          removeChild,
          focusChild,
        }}
      >
        <lng-view
          {...otherProps}
          ref={combinedRef}
          style={finalStyle}
          onKeyDown={handleFocusKeyDown}
        />
      </FocusGroupContext.Provider>
    );
  },
);

FocusGroup.displayName = 'FocusGroup';
