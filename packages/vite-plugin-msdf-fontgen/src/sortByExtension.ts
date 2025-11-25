export function sortByExtension(
  extensions: string[],
): (a: string, b: string) => number {
  return (a: string, b: string): number => {
    const extA = a.split('.').pop() as string;
    const extB = b.split('.').pop() as string;
    return extensions.indexOf(extA) - extensions.indexOf(extB);
  };
}
