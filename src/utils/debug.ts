// Simple runtime-controlled debug logger
// Enable via:
//  - localStorage.setItem('DEBUG_LOGS', '1')
//  - window.__DEBUG_LOGS = true
// Disable explicitly via localStorage.setItem('DEBUG_LOGS', '0')

export function isDebugEnabled(): boolean {
  try {
    const ls = typeof localStorage !== 'undefined' ? localStorage.getItem('DEBUG_LOGS') : null;
    if (ls === '0') return false;
    if (ls === '1') return true;
    if (typeof window !== 'undefined' && (window as any).__DEBUG_LOGS === true) return true;
    // Default: disabled in production, can be enabled via flags above
    // In dev, still keep disabled unless explicitly enabled to reduce noise
    return false;
  } catch {
    return false;
  }
}

export function dlog(...args: any[]) {
  if (isDebugEnabled()) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}

export function dwarn(...args: any[]) {
  if (isDebugEnabled()) {
    // eslint-disable-next-line no-console
    console.warn(...args);
  }
}

export function dinfo(...args: any[]) {
  if (isDebugEnabled()) {
    // eslint-disable-next-line no-console
    console.info(...args);
  }
}