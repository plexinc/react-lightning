export default function dedupeArray<T>(array: T[]): T[] {
  return array.filter((item, index) => array.indexOf(item) === index);
}
