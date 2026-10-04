// Runs async tasks one after another per key, in call order.
// Author: Satvik Hemant Gupta

// BUG-049/050: one queue per user for every progress mutation, so write
// order equals click order and a reset cannot be overtaken by an older write.
export function createWriteQueue() {
  const tails = new Map(); // key -> promise that never rejects

  // The returned promise settles with THIS task's result or error only. A
  // failed task never blocks or fails the ones queued behind it.
  function enqueue(key, task) {
    const previous = tails.get(key) || Promise.resolve();
    const run = previous.then(() => task());
    const tail = run.then(() => undefined, () => undefined);
    tails.set(key, tail);
    tail.then(() => {
      if (tails.get(key) === tail) tails.delete(key);
    });
    return run;
  }

  // Resolves once everything queued so far for this key has settled.
  function whenIdle(key) {
    return tails.get(key) || Promise.resolve();
  }

  return { enqueue, whenIdle, size: () => tails.size };
}
