export async function measureServerOperation<T>(name: string, operation: () => Promise<T>): Promise<T> {
  if (process.env.NODE_ENV === "production") return operation();

  const startedAt = performance.now();
  try {
    return await operation();
  } finally {
    console.info(`[perf] ${name}: ${Math.round(performance.now() - startedAt)} ms`);
  }
}
