/**
 * Marks a style object as a partial update (e.g. an animated style pushed by
 * the reanimated plugin). Style processors that treat a plain style prop as a
 * full snapshot (resetting anything missing from it) must skip that reset for
 * marked styles: the object only carries the keys that changed.
 */
export const PARTIAL_STYLE: unique symbol = Symbol.for('@plextv/partial-style');
