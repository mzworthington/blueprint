/** Yield so React can paint loading UI before heavy synchronous work. */
export function yieldToUi(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}
