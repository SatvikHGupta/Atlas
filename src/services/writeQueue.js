// Runs async tasks one after another per key, in call order. Author: Satvik Hemant Gupta

// one queue per user for every progress mutation
export function createWriteQueue() {
  const tails = new Map();

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

  function whenIdle(key) {
    return tails.get(key) || Promise.resolve();
  }

  return { enqueue, whenIdle, size: () => tails.size };
}
