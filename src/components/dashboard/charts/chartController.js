// Owns ONE Chart.js instance: create after the library has loaded, update in place, destroy on unmount. No React and no DOM
// APIs of its own (the canvas and the loader are passed in), so every race is unit-tested: unmount before the library loads,
// React StrictMode's mount/unmount/mount, updates that arrive while the library is still loading. Author: Satvik Hemant Gupta

export function createChartController({ loadChart, onError, prefersReducedMotion = () => false }) {
  let chart = null;
  let latest = null;      // newest config; used when the chart is created after an update already arrived
  let generation = 0;     // bumped by destroy(), so a load that finishes late knows it is stale

  const withMotion = (config) => (prefersReducedMotion()
    ? { ...config, options: { ...config.options, animation: false } }
    : config);

  return {
    /** Creates the chart once Chart.js is available. Safe to call again after destroy(). */
    async mount(canvas, config) {
      latest = config;
      const mine = ++generation;
      try {
        const Chart = await loadChart();
        if (mine !== generation || !canvas || !latest) return;
        chart?.destroy();
        chart = new Chart(canvas, withMotion(latest));
      } catch (error) {
        if (mine === generation) onError?.(error);
      }
    },

    /** New data/options for the same chart. Remembered when the chart does not exist yet. */
    update(config) {
      latest = config;
      if (!chart) return;
      chart.data = config.data;
      chart.options = withMotion(config).options;
      chart.update();
    },

    destroy() {
      generation++;
      chart?.destroy();
      chart = null;
    },

    get chart() { return chart; },
  };
}
