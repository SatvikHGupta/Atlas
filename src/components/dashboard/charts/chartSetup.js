// Loads Chart.js on demand and registers ONLY what the dashboard draws (bar, line, doughnut, radar), so the library is a
// separate chunk fetched when the dashboard opens and nothing else on the site pays for it. Author: Satvik Hemant Gupta
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
    }).catch((error) => { loading = null; throw error; }); // a failed download can be retried on the next mount
  }
  return loading;
}
