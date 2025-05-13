import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type MockElement,
  createMockElement,
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

    expect(focusedSpy).toHaveBeenCalledWith(element);
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

    expect(blurredSpy).toHaveBeenCalledWith(element1);
  });

  it('should emit "focusPathChanged" event when the focus path changes', () => {
    const element = createMockElement(1, 'a');
    const focusPathChangedSpy = vi.fn();

    focusManager.on('focusPathChanged', focusPathChangedSpy);
    focusManager.addElement(element, null, { autoFocus: true });

    expect(focusPathChangedSpy).toHaveBeenCalledWith([element]);
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
});
