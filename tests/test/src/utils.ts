const aggregator: Record<string, number[]> = {};

export function memoryUsage() {
  const memoryUsage = process.memoryUsage();
  const result: Record<string, string> = {};
  gc?.();
  for (const [key, value] of Object.entries<number>(((memoryUsage as unknown) as Record<string, number>))) {
    const mb = Math.round(value / (1024 * 1024));
    if (!Object.hasOwn(aggregator, key)) {
      aggregator[key] = [];
    }
    aggregator[key].push(mb);
    result[key] = `${mb.toString()}MB`;
  }
  return result;
}

export function statistics() {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(aggregator)) {
    const mean = Math.round(value.reduce((a, b) => a + b, 0) / value.length);
    const max = value.reduce((a, b) => (a < b ? b : a), 0);
    const min = value.reduce((a, b) => (a < b ? a : b), max);
    result[key] = `mean: ${mean.toString()}MB, min: ${min.toString()}MB, max: ${max.toString()}MB`;
  }
  return result;
}
