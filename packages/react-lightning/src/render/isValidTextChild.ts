export function isValidTextChild(text: unknown): text is boolean | number | string {
  return typeof text === 'string' || typeof text === 'number' || typeof text === 'boolean';
}

/**
 * True when `children` can be flattened to a string here in the renderer
 * (a primitive, an empty value, or an array of those). When this is false the
 * children include something only React can resolve — a `<FormattedMessage>`,
 * a ternary returning an element, a fragment — so we must let the reconciler
 * render them rather than guess at their text. See `shouldSetTextContent`.
 */
export function isPrimitiveTextContent(children: unknown): boolean {
  if (children == null || isValidTextChild(children)) {
    return true;
  }

  return (
    Array.isArray(children) && children.every((child) => child == null || isValidTextChild(child))
  );
}
