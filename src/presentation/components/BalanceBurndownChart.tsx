import { useEffect, useRef } from 'preact/hooks';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface BalanceBurndownChartProps {
  dates: string[];
  balances: number[];
}

export default function BalanceBurndownChart({ dates, balances }: BalanceBurndownChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Generate gradient for the line
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.5)'); // green
    gradient.addColorStop(1, 'rgba(239, 68, 68, 0.5)'); // red

    // Color based on trend
    const finalBalance = balances[balances.length - 1] || 0;
    const lineColor = finalBalance >= 0 ? '#10b981' : '#ef4444';

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dates.map(d => {
          const date = new Date(d);
          return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
        }),
        datasets: [{
          label: 'Balance',
          data: balances,
          borderColor: lineColor,
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: lineColor,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed.y ?? 0;
                return `Balance: $${value.toLocaleString('es-AR')}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            ticks: {
              callback: (value) => `$${Number(value).toLocaleString()}`
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [dates, balances]);

  if (dates.length === 0) {
    return (
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Evolución del Balance</h3>
        <div class="h-64 flex items-center justify-center text-gray-400">
          Agregá transacciones para ver la evolución
        </div>
      </div>
    );
  }

  return (
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Evolución del Balance</h3>
      <div class="h-64">
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
}