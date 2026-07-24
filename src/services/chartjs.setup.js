import {
  Chart,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend,
  DoughnutController,
  BarController,
  LineController,
} from 'chart.js';

Chart.register(
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend,
  DoughnutController,
  BarController,
  LineController,
);

Chart.defaults.color = '#9090a8';
Chart.defaults.borderColor = '#2a2a3a';
Chart.defaults.font.family = "'Plus Jakarta Sans', system-ui, sans-serif";
Chart.defaults.font.size = 12;

Chart.defaults.plugins.tooltip.backgroundColor = '#1e1e2e';
Chart.defaults.plugins.tooltip.borderColor = '#2a2a3a';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.titleColor = '#e8e8f0';
Chart.defaults.plugins.tooltip.bodyColor = '#9090a8';
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.cornerRadius = 8;
Chart.defaults.plugins.legend.display = false;
