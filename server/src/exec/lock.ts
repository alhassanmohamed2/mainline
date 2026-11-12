/**
 * Only one thing may change the playground at a time: a second command while
 * one is running would race with it on the same repository.
 */
let busy = false;

export function tryAcquire(): (() => void) | null {
  if (busy) return null;
  busy = true;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    busy = false;
  };
}
