// Loads Chart.js on demand and registers ONLY what the dashboard draws. Author: Satvik Hemant Gupta
let loading = null;

export function loadChart() {
  if (!loading) {
    loading = import('chart.js').then((m) => {
      m.Chart.register(
        m.BarController, m.BarElement, m.LineController, m.LineElement, m.PointElement,
        m.DoughnutController, m.ArcElement, m.RadarController, m.RadialLinearScale,
        m.CategoryScale, m.LinearScale, m.Tooltip, m.Legend, m.Filler,
      );
      return m.Chart;
    }).catch((error) => { loading = null; throw error; });
  }
  return loading;
}
