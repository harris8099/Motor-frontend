import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function PowerChart({ data }) {
  const chartData = [...data].reverse();

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#566b86',
          boxWidth: 14,
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        titleColor: '#213246',
        bodyColor: '#5b6f87',
        borderColor: 'rgba(50, 88, 132, 0.2)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(46, 132, 215, 0.08)' },
        ticks: { color: '#5e7088', maxTicksLimit: 10 },
      },
      y: {
        grid: { color: 'rgba(46, 132, 215, 0.08)' },
        ticks: { color: '#5e7088' },
        beginAtZero: true,
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  const labels = chartData.map((d) => new Date(d.ts).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true, hour: '2-digit', minute: '2-digit' }));

  const plotData = {
    labels,
    datasets: [
      {
        label: 'Power (W)',
        data: chartData.map((d) => d.power),
        borderColor: '#ef7c2e',
        backgroundColor: 'rgba(239, 124, 46, 0.18)',
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        pointHitRadius: 10,
      },
      {
        label: 'Power Factor',
        data: chartData.map((d) => d.power_factor),
        borderColor: '#1d7a55',
        backgroundColor: 'rgba(29, 122, 85, 0.1)',
        fill: false,
        yAxisID: 'y1',
        tension: 0.35,
        pointRadius: 0,
        pointHitRadius: 10,
      },
    ],
  };

  return (
    <div className="chart-container">
      <Line options={options} data={plotData} />
    </div>
  );
}
