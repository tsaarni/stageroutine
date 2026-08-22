/**
 * Helper function to apply cascading animation delays across an array of elements.
 */

export function stagger<T>(
  offsetSeconds: number,
  fn: (item: T, index: number, delay: number) => void,
): (item: T, index: number) => void {
  return (item: T, index: number) => {
    const delay = index * offsetSeconds;
    fn(item, index, delay);
  };
}
