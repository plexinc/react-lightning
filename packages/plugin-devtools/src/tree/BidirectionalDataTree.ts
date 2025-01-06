type ADD_ACTION = 'add';
type UPDATE_ACTION = 'update';
type REMOVE_ACTION = 'remove';

export const ROOT_NODE = 0;

export type Callback<T> = (
  action: ADD_ACTION | UPDATE_ACTION | REMOVE_ACTION,
  element: T,
) => void;

export type ElementTreeNode<T> = {
  id: number;
  parent?: ElementTreeNode<T>;
  element: T;
  children: Set<ElementTreeNode<T>>;
};

export class BidirectionalDataTree<T extends { id: number }> {
  private _elements = new Map<number, ElementTreeNode<T>>();
  private _subscribers: Set<Callback<T>> = new Set();
  private _root: Omit<ElementTreeNode<T>, 'element' | 'parent'>;

  public constructor() {
    this._root = {
      id: ROOT_NODE,
      children: new Set(),
    };

    this._elements.set(ROOT_NODE, this._root as ElementTreeNode<T>);
  }

  public reset() {
    this._elements = new Map([[ROOT_NODE, this._root as ElementTreeNode<T>]]);
    this._root.children = new Set();
  }

  public get(id: number) {
    return this._elements.get(id);
  }

  public add(parent: T, child: T) {
    let parentNode = this._elements.get(parent.id);
    let childNode = this._elements.get(child.id);

    if (!parentNode) {
      // If the parent didn't exist, assume it's at the root
      parentNode = this._getNode(parent, this._root as ElementTreeNode<T>);

      this._elements.set(parent.id, parentNode);
      this._root.children.add(parentNode);
    }

    if (childNode) {
      // If the child exists and was originally at the root, it's no longer at
      // the root
      if (this._root.children.has(childNode)) {
        this._root.children.delete(childNode);
      }
    } else {
      childNode = this._getNode(child, parentNode);
      this._elements.set(child.id, childNode);
    }

    parentNode.children.add(childNode);

    for (const callback of this._subscribers) {
      callback('add', child);
    }
  }

  public remove(elementId: number) {
    const childNode = this._elements.get(elementId);

    if (childNode) {
      childNode.parent?.children.delete(childNode);
      childNode.parent = undefined;

      for (const callback of this._subscribers) {
        callback('remove', childNode?.element);
      }
    }

    this._elements.delete(elementId);
  }

  public update(element: T) {
    const node = this._elements.get(element.id);

    if (node) {
      node.element = element;
    }

    for (const callback of this._subscribers) {
      callback('update', element);
    }
  }

  public subscribe(callback: Callback<T>) {
    this._subscribers.add(callback);

    return () => {
      this._subscribers.delete(callback);
    };
  }

  private _getNode(element: T, parent: ElementTreeNode<T>): ElementTreeNode<T> {
    return {
      id: element.id,
      element,
      parent,
      children: new Set(),
    };
  }
}
