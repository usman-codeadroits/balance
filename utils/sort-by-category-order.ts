/**
 * Sorts category groups by the admin-configured category order (sort_order
 * ascending, as returned by GET /v1/meals/categories). Categories that aren't
 * in the fetched order list (e.g. the endpoint failed) keep their original
 * relative order and are placed after the known ones.
 */
export function sortByCategoryOrder<T extends { id: number }>(
  groups: T[],
  categoryOrder: number[],
): T[] {
  if (categoryOrder.length === 0) return groups;
  const orderIndex = new Map(categoryOrder.map((id, idx) => [id, idx]));
  return [...groups].sort((a, b) => {
    const ai = orderIndex.has(a.id) ? orderIndex.get(a.id)! : Number.MAX_SAFE_INTEGER;
    const bi = orderIndex.has(b.id) ? orderIndex.get(b.id)! : Number.MAX_SAFE_INTEGER;
    return ai - bi;
  });
}
