import { useEffect, useRef } from 'preact/hooks';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface ExpenseChartProps {
  data: { month: string; amount: number }[];
  incomeData?: { month: string; amount: number }[];
}

export default function ExpenseChart({ data, incomeData = [] }: ExpenseChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Create income dataset (behind - lighter color)
    const incomeValues = incomeData.map(d => d.amount);
    
    // Create expense dataset (front - red)
    const expenseValues = data.map(d => d.amount);
    
    const labels = data.map(d => d.month);

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Ingresos',
            data: incomeValues,
            backgroundColor: 'rgba(16, 185, 129, 0.4)',
            borderColor: 'rgba(16, 185, 129, 0.8)',
            borderWidth: 1,
            borderRadius: 4,
            order: 2, // Behind
          },
          {
            label: 'Gastos',
            data: expenseValues,
            backgroundColor: 'rgba(239, 68, 68, 0.8)',
            borderColor: 'rgba(239, 68, 68, 1)',
            borderWidth: 1,
            borderRadius: 4,
            order: 1, // Front
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20,
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed.y ?? 0;
                const label = context.dataset.label ?? '';
                return `${label}: $${value.toLocaleString('es-AR')}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => `$${value}`
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
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, incomeData]);

  return (
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">Evolución de Gastos</h3>
      <div class="h-64">
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
}