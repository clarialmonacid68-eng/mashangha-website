export function createIdempotencyStore<T>() {
  const results = new Map<string, Promise<T>>();

  return {
    run(key: string, operation: () => Promise<T>) {
      const existing = results.get(key);

      if (existing) {
        return existing;
      }

      const result = operation().catch((error) => {
        results.delete(key);
        throw error;
      });
      results.set(key, result);
      return result;
    },
  };
}
