import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMockElement,
  type MockElement,
} from '../mocks/createMockElement';
import { FocusManager } from './FocusManager';

describe('FocusManager', () => {
  let focusManager: FocusManager<MockElement>;

  beforeEach(() => {
    focusManager = new FocusManager();
  });

  it('should initialize with an empty focus path', () => {
    expect(focusManager.focusPath).toEqual([]);
  });

  it('should add a focusable element', () => {
    const element = createMockElement(1, 'a');
    focusManager.addElement(element);

    expect(focusManager.getFocusNode(element)).not.toBeNull();
  });

  it('should remove a focusable element', () => {
    const element = createMockElement(1, 'a');
    focusManager.addElement(element);
    focusManager.removeElement(element);

    expect(focusManager.getFocusNode(element)).toBeNull();
    expect(focusManager.focusPath).not.toContain(element);
  });

  it('should focus an element when added with autoFocus', () => {
    const element = createMockElement(1, 'a');
    focusManager.addElement(element, null, { autoFocus: true });

    expect(element.focused).toBe(true);
    expect(focusManager.focusPath).toEqual([element]);
  });

  it('should blur the previously focused element when a new one is focused', () => {
    const element1 = createMockElement(1, 'a');
    const element2 = createMockElement(2, 'b');

    focusManager.addElement(element1, null, { autoFocus: false });

    expect(element1.focused).toBe(true);

    focusManager.addElement(element2, null, { autoFocus: true });

    expect(element1.focused).toBe(false);
    expect(element2.focused).toBe(true);
    expect(focusManager.focusPath).toEqual([element2]);
  });

  it('should maintain the focus path hierarchy', () => {
    const parent = createMockElement(1, 'parent');
    const child = createMockElement(2, 'child');

    focusManager.addElement(parent, null, { autoFocus: true });
    focusManager.addElement(child, parent, { autoFocus: true });

    expect(focusManager.focusPath).toEqual([parent, child]);
  });

  it('should emit "focused" event when an element is focused', () => {
    const element = createMockElement(1, 'a');
    const focusedSpy = vi.fn();

    focusManager.on('focused', focusedSpy);
    focusManager.addElement(element);
    focusManager.focus(element);

    expect(focusedSpy).toHaveBeenCalled();
    expect(focusedSpy).toHaveBeenCalledTimes(1);
    expect(focusedSpy).toHaveBeenCalledWith(
      element,
      // tseep sends events with extra undefined params
      undefined,
      undefined,
      undefined,
      undefined,
    );
  });

  it('should emit "blurred" event when an element is blurred', () => {
    const element1 = createMockElement(1, 'a');
    const element2 = createMockElement(2, 'b');
    const blurredSpy = vi.fn();

    focusManager.on('blurred', blurredSpy);
    focusManager.addElement(element1);
    focusManager.focus(element1);
    focusManager.addElement(element2);
    focusManager.focus(element2);

    expect(blurredSpy).toHaveBeenCalledWith(
      element1,
      // tseep sends events with extra undefined params
      undefined,
      undefined,
      undefined,
      undefined,
    );
  });

  it('should emit "focusPathChanged" event when the focus path changes', () => {
    const element = createMockElement(1, 'a');
    const focusPathChangedSpy = vi.fn();

    focusManager.on('focusPathChanged', focusPathChangedSpy);
    focusManager.addElement(element, null, { autoFocus: true });

    expect(focusPathChangedSpy).toHaveBeenCalledWith(
      [element],
      // tseep sends events with extra undefined params
      undefined,
      undefined,
      undefined,
      undefined,
    );
  });

  it('should not focus an element if it is not visible', () => {
    const element = createMockElement(1, 'a', false);
    focusManager.addElement(element, null, { autoFocus: true });

    expect(element.focused).toBe(false);
    expect(focusManager.focusPath).toEqual([]);
  });

  it('should recalculate the focus path when another element is focused in the tree', () => {
    const grandParent1 = createMockElement(1, 'grandParent1');
    const grandParent2 = createMockElement(2, 'grandParent2');
    const parent1 = createMockElement(3, 'parent1');
    const parent2 = createMockElement(4, 'parent2');
    const child1 = createMockElement(5, 'child1');
    const child2 = createMockElement(6, 'child2');
    const child3 = createMockElement(7, 'child3');
    const child4 = createMockElement(8, 'child4');

    focusManager.addElement(grandParent1, null, { autoFocus: false });
    focusManager.addElement(grandParent2, null, { autoFocus: true });
    focusManager.addElement(parent1, grandParent1, { autoFocus: false });
    focusManager.addElement(parent2, grandParent2, { autoFocus: true });
    focusManager.addElement(child1, parent1, { autoFocus: true });
    focusManager.addElement(child2, parent1, { autoFocus: true });
    focusManager.addElement(child3, parent2, { autoFocus: true });
    focusManager.addElement(child4, parent2, { autoFocus: true });

    expect(focusManager.focusPath).toEqual([grandParent2, parent2, child3]);

    focusManager.focus(child1);

    expect(child1.focused).toBe(true);
    expect(child2.focused).toBe(false);
    expect(child3.focused).toBe(false);
    expect(child4.focused).toBe(false);
    expect(parent1.focused).toBe(true);
    expect(parent2.focused).toBe(false);
    expect(grandParent1.focused).toBe(true);
    expect(focusManager.focusPath).toEqual([grandParent1, parent1, child1]);
  });

  it('should handle re-parenting of elements', () => {
    const parent1 = createMockElement(1, 'parent1');
    const parent2 = createMockElement(2, 'parent2');
    const child = createMockElement(3, 'child');

    focusManager.addElement(parent1, null, { autoFocus: true });
    expect(focusManager.focusPath).toEqual([parent1]);

    focusManager.addElement(child, parent1, { autoFocus: true });
    expect(focusManager.focusPath).toEqual([parent1, child]);

    focusManager.addElement(parent2, null, { autoFocus: true });
    expect(focusManager.focusPath).toEqual([parent1, child]);

    focusManager.addElement(child, parent2);
    expect(focusManager.focusPath).toEqual([parent1]);
  });

  it('should remove child elements from focus when parent is removed', () => {
    const grandParent = createMockElement(1, 'grandParent');
    const parent = createMockElement(2, 'parent');
    const child = createMockElement(3, 'child');

    focusManager.addElement(grandParent, null, { autoFocus: true });
    focusManager.addElement(parent, grandParent, { autoFocus: true });
    focusManager.addElement(child, parent, { autoFocus: true });

    expect(focusManager.focusPath).toEqual([grandParent, parent, child]);
    expect(child.focused).toBe(true);
    expect(parent.focused).toBe(true);
    expect(grandParent.focused).toBe(true);

    focusManager.removeElement(parent);

    expect(focusManager.focusPath).toEqual([grandParent]);
    expect(child.focused).toBe(false);
    expect(parent.focused).toBe(false);
    expect(grandParent.focused).toBe(true);
  });

  it('should build a focus tree properly even when elements are added in a different order', () => {
    const grandParent = createMockElement(1, 'grandParent');
    const parent1 = createMockElement(2, 'parent1');
    const parent2 = createMockElement(3, 'parent2');
    const child1 = createMockElement(4, 'child1');
    const child2 = createMockElement(5, 'child2');

    focusManager.addElement(child1, parent1);
    focusManager.addElement(child2, parent2);
    focusManager.addElement(parent1, grandParent);
    focusManager.addElement(parent2, grandParent);

    expect(focusManager.focusPath).toEqual([grandParent, parent1, child1]);
  });

  it('should focus on the sibling element when the current focused element is removed', () => {
    const parent = createMockElement(1, 'parent');
    const child1 = createMockElement(2, 'child1');
    const child2 = createMockElement(3, 'child2');

    focusManager.addElement(parent, null, { autoFocus: true });
    focusManager.addElement(child1, parent, { autoFocus: true });
    focusManager.addElement(child2, parent, { autoFocus: true });

    expect(focusManager.focusPath).toEqual([parent, child1]);

    focusManager.removeElement(child1);

    expect(focusManager.focusPath).toEqual([parent, child2]);
  });

  it('should not have a focused element when the current focused element is removed and its sibling is not focusable', () => {
    const parent = createMockElement(1, 'parent');
    const child1 = createMockElement(2, 'child1', true);
    const child2 = createMockElement(3, 'child2', false);

    focusManager.addElement(parent, null, { autoFocus: true });
    focusManager.addElement(child1, parent, { autoFocus: true });
    focusManager.addElement(child2, parent, { autoFocus: true });

    expect(focusManager.focusPath).toEqual([parent, child1]);

    focusManager.removeElement(child1);

    expect(focusManager.focusPath).toEqual([parent]);
  });

  it("should not allow focus on elements that are children of another focusable element, that isn't a FocusGroup", () => {
    const parent = createMockElement(1, 'parent');
    const child = createMockElement(2, 'child');
    const grandChild = createMockElement(3, 'grandChild');

    grandChild.parent = child;
    child.children.push(grandChild);

    focusManager.addElement(parent, null);
    focusManager.addElement(grandChild, parent);
    focusManager.addElement(child, parent);

    expect(child.focusable).toEqual(true);
    expect(grandChild.focusable).toEqual(false);

    expect(child.focused).toBe(true);
    expect(grandChild.focused).toBe(false);
    expect(focusManager.focusPath).toEqual([parent, child]);
  });

  describe('Layer Management (Modal Support)', () => {
    it('should create a new layer when pushLayer is called', () => {
      const mainElement = createMockElement(1, 'main');
      const modalElement = createMockElement(2, 'modal');

      // Add element to main layer
      focusManager.addElement(mainElement, null, { autoFocus: true });
      expect(focusManager.focusPath).toEqual([mainElement]);

      // Push new layer with modal
      focusManager.pushLayer();
      focusManager.addElement(modalElement);
      expect(focusManager.focusPath).toEqual([modalElement]);

      // Main element should still be focused on its layer, but modal takes precedence
      expect(mainElement.focused).toBe(false);
      expect(modalElement.focused).toBe(true);
    });

    it("should create a new layer when pushLayer is called, even if the layer doesn't have any elements added", () => {
      const mainElement = createMockElement(1, 'main');

      // Add element to main layer
      focusManager.addElement(mainElement, null, { autoFocus: true });
      expect(focusManager.focusPath).toEqual([mainElement]);

      // Push new layer with modal
      focusManager.pushLayer();
      expect(focusManager.focusPath.length).toEqual(0);
      expect(mainElement.focused).toBe(false);

      focusManager.popLayer();
      expect(focusManager.focusPath.length).toEqual(1);
      expect(mainElement.focused).toBe(true);
    });

    it('should maintain separate focus paths for different layers', () => {
      const mainElement = createMockElement(1, 'main');
      const modalElement = createMockElement(2, 'modal');
      const modalChild = createMockElement(3, 'modalChild');

      // Setup main layer
      focusManager.addElement(mainElement, null, { autoFocus: true });
      expect(focusManager.focusPath).toEqual([mainElement]);

      // Push modal layer
      focusManager.pushLayer();
      focusManager.addElement(modalElement);
      expect(focusManager.focusPath).toEqual([modalElement]);

      // Add child to modal
      focusManager.addElement(modalChild, modalElement, { autoFocus: true });
      expect(focusManager.focusPath).toEqual([modalElement, modalChild]);
    });

    it('should not allow focusing elements outside the active layer', () => {
      const mainElement = createMockElement(1, 'main');
      const modalElement = createMockElement(2, 'modal');

      // Setup main layer
      focusManager.addElement(mainElement, null, { autoFocus: true });
      expect(focusManager.focusPath).toEqual([mainElement]);

      // Push modal layer
      focusManager.pushLayer();
      focusManager.addElement(modalElement);
      expect(focusManager.focusPath).toEqual([modalElement]);

      // Try to focus element from main layer - should be blocked
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      focusManager.focus(mainElement);

      expect(focusManager.focusPath).toEqual([modalElement]);
      expect(mainElement.focused).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should restore previous layer focus when popLayer is called', () => {
      const mainElement = createMockElement(1, 'main');
      const modalElement = createMockElement(2, 'modal');

      // Setup main layer
      focusManager.addElement(mainElement, null, { autoFocus: true });
      expect(focusManager.focusPath).toEqual([mainElement]);
      expect(mainElement.focused).toBe(true);

      // Push modal layer
      focusManager.pushLayer();
      focusManager.addElement(modalElement);
      expect(focusManager.focusPath).toEqual([modalElement]);
      expect(mainElement.focused).toBe(false);
      expect(modalElement.focused).toBe(true);

      // Pop modal layer
      focusManager.popLayer();
      expect(focusManager.focusPath).toEqual([mainElement]);
      expect(modalElement.focused).toBe(false);
      expect(mainElement.focused).toBe(true);
    });

    it('should handle multiple nested layers', () => {
      const mainElement = createMockElement(1, 'main');
      const modal1Element = createMockElement(2, 'modal1');
      const modal2Element = createMockElement(3, 'modal2');

      // Setup main layer
      focusManager.addElement(mainElement, null, { autoFocus: true });

      // Push first modal
      focusManager.pushLayer();
      focusManager.addElement(modal1Element);
      expect(focusManager.focusPath).toEqual([modal1Element]);

      // Push second modal
      focusManager.pushLayer();
      focusManager.addElement(modal2Element);
      expect(focusManager.focusPath).toEqual([modal2Element]);

      // Pop second modal
      focusManager.popLayer();
      expect(focusManager.focusPath).toEqual([modal1Element]);

      // Pop first modal
      focusManager.popLayer();
      expect(focusManager.focusPath).toEqual([mainElement]);
    });

    it('should not close the main layer when popLayer is called', () => {
      const mainElement = createMockElement(1, 'main');

      // Setup main layer
      focusManager.addElement(mainElement, null, { autoFocus: true });
      expect(focusManager.focusPath).toEqual([mainElement]);

      // Try to pop the main layer - should not do anything
      focusManager.popLayer();
      expect(focusManager.focusPath).toEqual([mainElement]);
      expect(mainElement.focused).toBe(true);
    });

    it('should close all layers except main when popAllLayers is called', () => {
      const mainElement = createMockElement(1, 'main');
      const modal1Element = createMockElement(2, 'modal1');
      const modal2Element = createMockElement(3, 'modal2');
      const modal3Element = createMockElement(4, 'modal3');

      // Setup main layer
      focusManager.addElement(mainElement, null, { autoFocus: true });

      // Push multiple modals
      focusManager.pushLayer();
      focusManager.addElement(modal1Element);
      focusManager.pushLayer();
      focusManager.addElement(modal2Element);
      focusManager.pushLayer();
      focusManager.addElement(modal3Element);
      expect(focusManager.focusPath).toEqual([modal3Element]);

      // Pop all layers
      focusManager.popAllLayers();
      expect(focusManager.focusPath).toEqual([mainElement]);
      expect(modal1Element.focused).toBe(false);
      expect(modal2Element.focused).toBe(false);
      expect(modal3Element.focused).toBe(false);
      expect(mainElement.focused).toBe(true);
    });

    it('should emit modalOpened and modalClosed events', () => {
      const mainElement = createMockElement(1, 'main');
      const modalElement = createMockElement(2, 'modal');
      const modalOpenedSpy = vi.fn();
      const modalClosedSpy = vi.fn();

      focusManager.on('layerAdded', modalOpenedSpy);
      focusManager.on('layerRemoved', modalClosedSpy);

      // Setup main layer
      focusManager.addElement(mainElement, null, { autoFocus: true });

      // Push modal layer
      focusManager.pushLayer();
      focusManager.addElement(modalElement);
      expect(modalOpenedSpy).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );

      // Pop modal layer
      focusManager.popLayer();
      expect(modalClosedSpy).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should handle complex hierarchies within layers', () => {
      const mainParent = createMockElement(1, 'mainParent');
      const mainChild = createMockElement(2, 'mainChild');
      const modalParent = createMockElement(3, 'modalParent');
      const modalChild1 = createMockElement(4, 'modalChild1');
      const modalChild2 = createMockElement(5, 'modalChild2');

      // Setup main layer hierarchy
      focusManager.addElement(mainParent, null, { autoFocus: true });
      focusManager.addElement(mainChild, mainParent, { autoFocus: true });
      expect(focusManager.focusPath).toEqual([mainParent, mainChild]);

      // Push modal with hierarchy
      focusManager.pushLayer();
      focusManager.addElement(modalParent);
      focusManager.addElement(modalChild1, modalParent, { autoFocus: true });
      focusManager.addElement(modalChild2, modalParent, { autoFocus: false });
      expect(focusManager.focusPath).toEqual([modalParent, modalChild1]);

      // Focus different child in modal
      focusManager.focus(modalChild2);
      expect(focusManager.focusPath).toEqual([modalParent, modalChild2]);

      // Pop modal and verify main layer is restored
      focusManager.popLayer();
      expect(focusManager.focusPath).toEqual([mainParent, mainChild]);
    });

    it('should properly handle element removal within layers', () => {
      const mainElement = createMockElement(1, 'main');
      const modalParent = createMockElement(2, 'modalParent');
      const modalChild1 = createMockElement(3, 'modalChild1');
      const modalChild2 = createMockElement(4, 'modalChild2');

      // Setup main layer
      focusManager.addElement(mainElement, null, { autoFocus: true });

      // Push modal with children
      focusManager.pushLayer();
      focusManager.addElement(modalParent);
      focusManager.addElement(modalChild1, modalParent, { autoFocus: true });
      focusManager.addElement(modalChild2, modalParent, { autoFocus: false });
      expect(focusManager.focusPath).toEqual([modalParent, modalChild1]);

      // Remove focused child, should focus next available
      focusManager.removeElement(modalChild1);
      expect(focusManager.focusPath).toEqual([modalParent, modalChild2]);

      // Remove last child, should focus parent
      focusManager.removeElement(modalChild2);
      expect(focusManager.focusPath).toEqual([modalParent]);
    });
  });
});
