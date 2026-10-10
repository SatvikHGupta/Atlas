// Owns ONE Chart.js instance: create after the library has loaded. Author: Satvik Hemant Gupta

export function createChartController({ loadChart, onError, prefersReducedMotion = () => false }) {
  let chart = null;
  let latest = null;
  let generation = 0;

  const withMotion = (config) => (prefersReducedMotion()
    ? { ...config, options: { ...config.options, animation: false } }
    : config);

  return {
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
