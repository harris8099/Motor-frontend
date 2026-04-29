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

export default function FrequencyChart({ data }) {
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
        min: 45,
        max: 55,
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
        label: 'Frequency (Hz)',
        data: chartData.map((d) => d.frequency),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        pointHitRadius: 10,
      },
      {
        label: 'Target (50 Hz)',
        data: chartData.map(() => 50),
        borderColor: '#22c55e',
        backgroundColor: 'transparent',
        fill: false,
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
      },
    ],
  };

  return (
    <div className="chart-container">
      <Line options={options} data={plotData} />
    </div>
  );
}
