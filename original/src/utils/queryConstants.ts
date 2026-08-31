const staleTimeEnv = Number(import.meta.env.VITE_STALE_TIME);
const gcTimeEnv = Number(import.meta.env.VITE_GC_TIME);

export const DEFAULT_STALE_TIME_MS = Number.isFinite(staleTimeEnv) ? staleTimeEnv : 5 * 60 * 1000;

export const DEFAULT_GC_TIME_MS = Number.isFinite(gcTimeEnv) ? gcTimeEnv : 5 * 60 * 1000;
