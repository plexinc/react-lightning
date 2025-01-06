import { useCallback, useContext, useState, useSyncExternalStore } from 'react';
import { useExtensionMessaging } from '../communication/useExtensionMessaging';
import { ROOT_NODE } from '../tree/BidirectionalDataTree';
import { ElementTreeContext } from './ElementTreeContext';

export const useElementTreeContext = () => {
  const context = useContext(ElementTreeContext);
  const [, setChangeCounter] = useState(0);
  const tree = context.get();

  useExtensionMessaging(
    'elementUpdated',
    useCallback(
      ({ data }) => {
        console.log('Received update!', data);
        tree.update(data);
      },
      [tree],
    ),
  );

  useExtensionMessaging(
    'elementRemoved',
    useCallback(
      ({ data }) => {
        tree.remove(data);
      },
      [tree],
    ),
  );

  useExtensionMessaging(
    'replaceElements',
    useCallback(
      ({ data }) => {
        tree.reset();

        for (const element of Object.values(data)) {
          for (const childId of element.children) {
            const child = data[childId];

            if (child) {
              tree.add(element, child);
            }
          }

          if (element.parent) {
            const parent = data[element.parent];

            if (parent) {
              tree.add(parent, element);
            }
          }
        }
      },
      [tree],
    ),
  );

  const rootNode = useSyncExternalStore(
    (onUpdate) => {
      return tree.subscribe(() => {
        onUpdate();
        setChangeCounter((counter) => counter + 1);
      });
    },
    () => tree.get(ROOT_NODE),
  );

  return rootNode ?? null;
};
