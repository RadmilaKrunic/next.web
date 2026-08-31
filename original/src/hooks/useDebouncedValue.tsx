import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = globalThis.setTimeout(() => setDebounced(value), delay);
    return () => globalThis.clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
