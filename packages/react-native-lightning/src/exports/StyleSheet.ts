export function create(
  stylesObject: Record<string, Partial<CSSStyleDeclaration>>,
) {
  return stylesObject;
}

export function flatten<T>(...args: T[]): Exclude<T, false | null | undefined> {
  return Object.assign(
    {},
    ...args
      .filter((obj) => obj != null && obj !== false)
      .flat(Number.POSITIVE_INFINITY),
  );
}

export function compose<T>(style1: T, style2: T) {
  if (style1 && style2) {
    return [style1, style2];
  }
  return style1 || style2;
}

export function setStyleAttributePreprocessor(...args: unknown[]) {
  console.log('>> setStyleAttributePreprocessor', args);
}

export const hairlineWidth = 1;

export const absoluteFillObject = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
};

/**
 * A very common pattern is to create overlays with position absolute and zero positioning,
 * so `absoluteFill` can be used for convenience and to reduce duplication of these repeated
 * styles.
 */
export const absoluteFill = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
};
