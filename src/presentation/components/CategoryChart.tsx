import { useEffect, useRef } from 'preact/hooks';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface CategoryChartProps {
  data: { category: string; amount: number; color: string }[];
}

export default function CategoryChart({ data }: CategoryChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Calculate percentages
    const total = data.reduce((sum, d) => sum + d.amount, 0);
    const dataWithPercentage = data.map(d => ({
      ...d,
      percentage: total > 0 ? ((d.amount / total) * 100).toFixed(1) : '0'
    }));

    chartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: dataWithPercentage.map(d => `${d.category} (${d.percentage}%)`),
        datasets: [{
          data: dataWithPercentage.map(d => d.amount),
          backgroundColor: dataWithPercentage.map(d => d.color),
          borderWidth: 0,
          hoverOffset: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 12,
              padding: 16,
              usePointStyle: true,
              font: {
                size: 12
              },
              generateLabels: (chart) => {
                const datasets = chart.data.datasets;
                return chart.data.labels?.map((label, i) => ({
                  text: label as string,
                  fillStyle: (datasets[0] as any).backgroundColor?.[i] as string,
                  hidden: false,
                  index: i,
                })) || [];
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed ?? 0;
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                return `$${value.toLocaleString('es-AR')} (${percentage}%)`;
              }
            }
          }
        },
        cutout: '60%',
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data]);

  const total = data.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">Gastos por Categoría</h3>
      <div class="h-64">
        {total === 0 ? (
          <div class="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
            No hay datos suficientes
          </div>
        ) : (
          <canvas ref={canvasRef}></canvas>
        )}
      </div>
      {total > 0 && (
        <div class="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Total: ${total.toLocaleString('es-AR')}
        </div>
      )}
    </div>
  );
}