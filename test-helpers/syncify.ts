export async function syncify<T>(fn: () => Promise<T>): Promise<() => T> {
  let value;
  let error;
  try {
    value = await fn();
  } catch (err) {
    error = err;
  }
  return () => {
    if (error) {
      throw error;
    }
    if (value) {
      return value;
    }
  };
}
