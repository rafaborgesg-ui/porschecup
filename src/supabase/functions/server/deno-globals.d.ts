// Minimal ambient declarations to satisfy the editor for Deno-specific globals
// This file is not emitted (noEmit true) and only aids IntelliSense.

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// Hono context 'c' helpers (very light typing to silence implicit any)
type HonoContext = any;
declare type Next = () => Promise<void>;