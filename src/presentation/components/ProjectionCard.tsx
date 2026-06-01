import { useState } from 'preact/hooks';
import {
  formatCurrencyARS,
  type MonthlyProjection,
  type CategoryProjection,
} from '../../application/services/BalanceProjectionService';
import MonthlyProjectionChart from './MonthlyProjectionChart';
import CategoryProjectionChart from './CategoryProjectionChart';

interface ProjectionCardProps {
  // Overview tab (existing API — preserved for backwards compatibility)
  days: number;
  date: string | null;
  message: string;
  dailyAverage: number;
  currentBalance: number;

  // Monthly tab (Phase 2.6) — optional, falling back to empty state when omitted
  monthlyData?: MonthlyProjection[];

  // Category tab (Phase 2.6) — optional, falling back to empty state when omitted
  categoryData?: CategoryProjection[];

  /** Optional trend analysis displayed in the Overview tab as a hint. */
  trend?: {
    movingAverage: number;
    direction: 'up' | 'down' | 'stable';
    momentum: 'accelerating' | 'decelerating' | 'constant';
  } | null;
}

type TabId = 'overview' | 'monthly' | 'category';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: 'Resumen', icon: '📊' },
  { id: 'monthly', label: 'Mensual', icon: '📅' },
  { id: 'category', label: 'Categoría', icon: '🏷️' },
];

/**
 * Projection card with three tabs (per Phase 2 spec).
 *
 * - **Overview** (default): daily average, current balance, days remaining
 *   — the original Phase 1 layout, preserved exactly.
 * - **Monthly**: line chart of income/expense/balance with dashed projected
 *   months. Powered by `MonthlyProjectionChart`.
 * - **Category**: bar visualization of per-category spend and days-remaining.
 *   Powered by `CategoryProjectionChart`.
 */
export default function ProjectionCard({
  days,
  date,
  message,
  dailyAverage,
  currentBalance,
  monthlyData,
  categoryData,
  trend,
}: ProjectionCardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const getStatusColor = () => {
    if (currentBalance <= 0) return 'bg-red-50 border-red-200 text-red-700';
    if (days <= 7) return 'bg-yellow-50 border-yellow-200 text-yellow-700';
    return 'bg-blue-50 border-blue-200 text-blue-700';
  };

  const getIcon = () => {
    if (currentBalance <= 0) return '⚠️';
    if (days <= 7) return '⏰';
    return '📅';
  };

  return (
    <div class={`rounded-lg shadow p-6 border ${getStatusColor()}`}>
      {/* Header */}
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">Proyección de Gastos</h3>
        <span class="text-2xl">{getIcon()}</span>
      </div>

      {/* Tabs */}
      <div
        class="flex gap-1 mb-4 border-b border-current/20"
        role="tablist"
        aria-label="Vistas de proyección"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              class={`px-3 py-2 text-sm font-medium rounded-t-md transition-colors ${
                isActive
                  ? 'bg-white/60 text-current border-b-2 border-current'
                  : 'text-current/70 hover:text-current hover:bg-white/30'
              }`}
            >
              <span class="mr-1" aria-hidden="true">{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Panel: Overview */}
      {activeTab === 'overview' && (
        <div
          id="panel-overview"
          role="tabpanel"
          aria-labelledby="tab-overview"
          class="space-y-3"
        >
          <div>
            <p class="text-sm opacity-75">Promedio diario de gastos</p>
            <p class="text-xl font-bold">{formatCurrencyARS(dailyAverage)}</p>
          </div>

          <div>
            <p class="text-sm opacity-75">Balance actual</p>
            <p class="text-xl font-bold">{formatCurrencyARS(currentBalance)}</p>
          </div>

          <hr class="border-current opacity-20" />

          <div>
            <p class="text-sm opacity-75">Días restantes estimado</p>
            <p class="text-2xl font-bold">
              {currentBalance <= 0
                ? 'Sin fondos'
                : dailyAverage <= 0
                ? 'Sin gastos'
                : `${days} días`}
            </p>
            {date && currentBalance > 0 && (
              <p class="text-sm opacity-75">
                Hasta el {new Date(date).toLocaleDateString('es-AR', {
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
            )}
          </div>

          {/* Trend hint (Phase 2.3) — only when we have a non-null trend. */}
          {trend && (
            <div class="pt-2 border-t border-current/20">
              <p class="text-sm opacity-75">Tendencia</p>
              <div class="flex items-center gap-2 text-sm">
                <span aria-hidden="true">
                  {trend.direction === 'up' && '↗️'}
                  {trend.direction === 'down' && '↘️'}
                  {trend.direction === 'stable' && '➡️'}
                </span>
                <span>
                  {trend.direction === 'up' && 'Gastos en aumento'}
                  {trend.direction === 'down' && 'Gastos en descenso'}
                  {trend.direction === 'stable' && 'Gastos estables'}
                </span>
                <span class="opacity-60">
                  · {trend.momentum === 'accelerating' && 'acelerando'}
                  {trend.momentum === 'decelerating' && 'desacelerando'}
                  {trend.momentum === 'constant' && 'constante'}
                </span>
              </div>
              <p class="text-xs opacity-60 mt-1">
                Media móvil: {formatCurrencyARS(trend.movingAverage)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Panel: Monthly */}
      {activeTab === 'monthly' && (
        <div
          id="panel-monthly"
          role="tabpanel"
          aria-labelledby="tab-monthly"
        >
          {monthlyData && monthlyData.length > 0 ? (
            <MonthlyProjectionChart data={monthlyData} />
          ) : (
            <EmptyTab
              title="Sin proyección mensual"
              hint="No hay datos suficientes para calcular la proyección."
            />
          )}
        </div>
      )}

      {/* Panel: Category */}
      {activeTab === 'category' && (
        <div
          id="panel-category"
          role="tabpanel"
          aria-labelledby="tab-category"
        >
          {categoryData && categoryData.length > 0 ? (
            <CategoryProjectionChart data={categoryData} />
          ) : (
            <EmptyTab
              title="Sin proyección por categoría"
              hint="Agregá categorías de gasto para ver la proyección."
            />
          )}
        </div>
      )}
    </div>
  );
}

function EmptyTab({ title, hint }: { title: string; hint: string }) {
  return (
    <div class="bg-white/60 rounded-md p-6 text-center">
      <p class="font-medium text-gray-700">{title}</p>
      <p class="text-sm text-gray-500 mt-1">{hint}</p>
    </div>
  );
}
