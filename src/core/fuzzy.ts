import fuzzysort from "fuzzysort";

export interface FuzzyResult<T> {
  item: T;
  indices: readonly number[];
  score: number;
}

export function fuzzyFilter<T>(
  items: T[],
  query: string,
  keyFn: (item: T) => string,
): FuzzyResult<T>[] {
  const q = query.trim();
  if (!q) {
    return items.map((item) => ({ item, indices: [], score: 0 }));
  }
  const out: FuzzyResult<T>[] = [];
  for (const item of items) {
    const target = keyFn(item);
    const result = fuzzysort.single(q, target);
    if (result) {
      out.push({
        item,
        indices: result.indexes as readonly number[],
        score: result.score,
      });
    }
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}
