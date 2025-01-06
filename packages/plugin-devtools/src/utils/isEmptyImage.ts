// Checks if the image is all transparent pixels
export function isEmptyImage(data: ArrayLike<number>): boolean {
  let isTransparent = true;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] !== 0) {
      isTransparent = false;
      break;
    }
  }

  return isTransparent;
}
