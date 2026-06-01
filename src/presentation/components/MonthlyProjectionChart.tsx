import { useEffect, useRef } from 'preact/hooks';
import { Chart, registerables } from 'chart.js';
import type { MonthlyProjection } from '../../application/services/BalanceProjectionService';

Chart.register(...registerables);

interface MonthlyProjectionChartProps {
  /**
   * Output of `calculateMonthlyProjection`. The component renders:
   * - past months (`isProjected: false`) as solid lines
   * - future months (`isProjected: true`) as dashed lines
   */
  data: MonthlyProjection[];
  /** Optional currency formatter for tooltips; defaults to ARS. */
  formatCurrency?: (amount: number) => string;
}

/**
 * Chart.js line chart showing income, expenses, and balance across the
 * monthly projection window.
 *
 * Past months are drawn as solid lines; future projected months are drawn
 * as dashed lines so the boundary is visible at a glance. A vertical guide
 * marks the transition from actuals to projection.
 */
export default function MonthlyProjectionChart({
  data,
  formatCurrency,
}: MonthlyProjectionChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const fmt = formatCurrency ?? defaultFormat;

    // Build a per-point projected flag for each series. Chart.js lets us
    // override the borderDash per-point via scriptable options.
    const incomeValues = data.map((d) => d.totalIncome);
    const expenseValues = data.map((d) => d.totalExpenses);
    const balanceValues = data.map((d) => d.balance);
    const labels = data.map((d) => formatMonthLabel(d.month));

    // Identify the index of the first projected month so we can place a
    // vertical annotation there.
    const firstProjectedIndex = data.findIndex((d) => d.isProjected);

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Ingresos',
            data: incomeValues,
            borderColor: 'rgba(16, 185, 129, 1)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: 'rgba(16, 185, 129, 1)',
            pointBorderColor: '#fff',
            pointBorderWidth: 1,
            fill: false,
            borderDash: (ctx) => (isProjectedAt(data, ctx.dataIndex) ? [6, 4] : undefined),
            segment: {
              borderDash: (ctx) =>
                isProjectedAt(data, ctx.p1DataIndex) ? [6, 4] : undefined,
            },
          },
          {
            label: 'Gastos',
            data: expenseValues,
            borderColor: 'rgba(239, 68, 68, 1)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: 'rgba(239, 68, 68, 1)',
            pointBorderColor: '#fff',
            pointBorderWidth: 1,
            fill: false,
            borderDash: (ctx) => (isProjectedAt(data, ctx.dataIndex) ? [6, 4] : undefined),
            segment: {
              borderDash: (ctx) =>
                isProjectedAt(data, ctx.p1DataIndex) ? [6, 4] : undefined,
            },
          },
          {
            label: 'Balance',
            data: balanceValues,
            borderColor: 'rgba(59, 130, 246, 1)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: 'rgba(59, 130, 246, 1)',
            pointBorderColor: '#fff',
            pointBorderWidth: 1,
            fill: false,
            borderDash: (ctx) => (isProjectedAt(data, ctx.dataIndex) ? [6, 4] : undefined),
            segment: {
              borderDash: (ctx) =>
                isProjectedAt(data, ctx.p1DataIndex) ? [6, 4] : undefined,
            },
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 16,
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed.y ?? 0;
                const label = context.dataset.label ?? '';
                const projected = isProjectedAt(data, context.dataIndex);
                const suffix = projected ? ' (proyectado)' : '';
                return `${label}: ${fmt(value)}${suffix}`;
              },
              title: (items) => {
                if (items.length === 0) return '';
                const idx = items[0]!.dataIndex;
                const month = data[idx]?.month;
                if (!month) return '';
                const projected = data[idx]?.isProjected ? ' (proyectado)' : '';
                return `${month}${projected}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => `$${Number(value).toLocaleString('es-AR')}`,
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
      },
      plugins: [
        {
          // Custom plugin: draw a vertical guide at the actuals/projection boundary.
          id: 'projection-divider',
          afterDraw: (chart) => {
            if (firstProjectedIndex <= 0) return;
            const xScale = chart.scales.x;
            if (!xScale) return;
            const x = xScale.getPixelForValue(firstProjectedIndex - 0.5);
            const { top, bottom } = chart.chartArea;
            const c = chart.ctx;
            c.save();
            c.strokeStyle = 'rgba(107, 114, 128, 0.6)';
            c.setLineDash([4, 4]);
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(x, top);
            c.lineTo(x, bottom);
            c.stroke();
            c.restore();
          },
        },
      ],
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, formatCurrency]);

  // Empty state: no data at all.
  if (data.length === 0) {
    return (
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Proyección Mensual
        </h3>
        <div class="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
          Sin datos suficientes para proyectar
        </div>
      </div>
    );
  }

  return (
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">
        Proyección Mensual
      </h3>
      <div class="h-64">
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
}

/**
 * True when the data point at `index` is a projected (future) month.
 */
function isProjectedAt(data: MonthlyProjection[], index: number): boolean {
  return data[index]?.isProjected === true;
}

/**
 * Format a `YYYY-MM` month key as a short Spanish label (e.g. `'may 2026'`).
 */
function formatMonthLabel(key: string): string {
  const [yearStr, monthStr] = key.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return key;
  const date = new Date(year, month - 1, 1);
  return date
    .toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })
    .replace('.', '');
}

function defaultFormat(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount);
}
