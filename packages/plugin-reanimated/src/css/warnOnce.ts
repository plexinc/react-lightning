const warned = new Set<string>();

/** Style objects are rebuilt every render, so a plain warn would spam the log. */
export function warnOnce(message: string): void {
  if (!import.meta.env.DEV || warned.has(message)) {
    return;
  }

  warned.add(message);
  console.warn(`[react-lightning] ${message}`);
}

export function resetWarnOnce(): void {
  warned.clear();
}
