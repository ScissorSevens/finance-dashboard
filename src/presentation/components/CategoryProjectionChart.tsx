import { useMemo } from 'preact/hooks';
import type { CategoryProjection } from '../../application/services/BalanceProjectionService';
import { getCategoryDisplayName, getCategoryDisplayColor } from '../../application/services/BalanceProjectionService';

interface CategoryProjectionChartProps {
  /** Output of `calculateCategoryProjections`. */
  data: CategoryProjection[];
  /** Optional currency formatter; defaults to ARS. */
  formatCurrency?: (amount: number) => string;
}

/**
 * Bar visualization for category projections. Each row shows:
 * - the category display name (Spanish label for defaults, raw name for customs)
 * - a progress bar whose fill is `totalSpent / max(totalSpent)`
 * - `totalSpent`, `avgMonthly`, and `daysRemaining` stats
 *
 * The largest `totalSpent` value defines the bar width baseline (100% fill).
 * This is a complement to the existing `CategoryChart` doughnut: that one
 * answers "how is my spend distributed?", this one answers "which category
 * is most aggressive and how long will my balance last?".
 */
export default function CategoryProjectionChart({
  data,
  formatCurrency,
}: CategoryProjectionChartProps) {
  const fmt = formatCurrency ?? defaultFormat;

  // Sort by totalSpent descending so the heaviest categories sit on top.
  // Also compute the max once for the bar-width baseline.
  const sorted = useMemo(
    () => [...data].sort((a, b) => b.totalSpent - a.totalSpent),
    [data]
  );
  const maxSpent = useMemo(
    () => sorted.reduce((m, d) => Math.max(m, d.totalSpent), 0),
    [sorted]
  );

  // Empty state: no categories at all.
  if (sorted.length === 0) {
    return (
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Proyección por Categoría
        </h3>
        <div class="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
          Sin categorías de gasto registradas
        </div>
      </div>
    );
  }

  // "All zero" state: every category has totalSpent = 0 (no spending yet).
  const hasAnySpending = sorted.some((d) => d.totalSpent > 0);
  if (!hasAnySpending) {
    return (
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Proyección por Categoría
        </h3>
        <div class="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
          No hay gastos registrados para proyectar
        </div>
      </div>
    );
  }

  return (
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">
        Proyección por Categoría
      </h3>
      <ul class="space-y-4">
        {sorted.map((projection) => {
          const displayName = getCategoryDisplayName(projection.name);
          const color = getCategoryDisplayColor(projection.name);
          const fillPct = maxSpent > 0 ? (projection.totalSpent / maxSpent) * 100 : 0;
          const daysLabel =
            projection.daysRemaining > 0
              ? `${projection.daysRemaining} día${projection.daysRemaining === 1 ? '' : 's'}`
              : '—';

          return (
            <li
              key={projection.categoryId}
              class="border-b border-gray-100 dark:border-gray-700 pb-3 last:border-b-0 last:pb-0"
            >
              <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-2">
                  <span
                    class="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  <span class="font-medium text-gray-800 dark:text-white">
                    {displayName}
                  </span>
                </div>
                <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {fmt(projection.totalSpent)}
                </span>
              </div>
              <div
                class="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={Math.round(fillPct)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  class="h-full rounded-full transition-all"
                  style={{
                    width: `${fillPct}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
              <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>
                  Promedio mensual:{' '}
                  <strong class="text-gray-700 dark:text-gray-300">
                    {fmt(projection.avgMonthly)}
                  </strong>
                </span>
                <span>
                  Días restantes:{' '}
                  <strong class="text-gray-700 dark:text-gray-300">
                    {daysLabel}
                  </strong>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function defaultFormat(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(amount);
}
