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

    chartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.category),
        datasets: [{
          data: data.map(d => d.amount),
          backgroundColor: data.map(d => d.color),
          borderWidth: 0,
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
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Gastos por Categoría</h3>
      <div class="h-64">
        {total === 0 ? (
          <div class="flex items-center justify-center h-full text-gray-400">
            No hay datos suficientes
          </div>
        ) : (
          <canvas ref={canvasRef}></canvas>
        )}
      </div>
    </div>
  );
}