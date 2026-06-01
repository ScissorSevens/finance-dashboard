interface MetricCardProps {
  title: string;
  value: string;
  type: 'balance' | 'income' | 'expense';
  /** 6 trailing months of data, oldest → newest. */
  sparklineData: number[];
  /** MoM % change vs previous month; null when no prior month or when prev=0. */
  changePct: number | null;
  /** Direction of the raw change. UI applies metric-specific semantics. */
  direction: 'up' | 'down' | 'flat';
  /** Lucide-style icon name. */
  icon: 'trending-up' | 'trending-down' | 'wallet';
}

/**
 * Modernized KPI card.
 *
 * Layout:
 *   ┌────────────────────────────┐
 *   │ TITLE              [icon]  │
 *   │                            │
 *   │ VALUE (3xl)                │
 *   │                            │
 *   │ [sparkline]   ↗ +12.3%     │
 *   └────────────────────────────┘
 *
 * Background is intentionally neutral (no color tint) — color is used only
 * as an accent on the icon, sparkline, and trend label. This is grounded in
 * the kpi-dashboard-design principle "show context" (sparkline + MoM trend).
 */
export default function MetricCard({
  title,
  value,
  type,
  sparklineData,
  changePct,
  direction,
  icon,
}: MetricCardProps) {
  const accent = getAccent(type);

  return (
    <article class="card-modern flex flex-col gap-3">
      <header class="flex items-center justify-between">
        <span class="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
          {title}
        </span>
        <CardIcon name={icon} class={`h-5 w-5 ${accent.icon}`} />
      </header>

      <div class="text-3xl font-bold tracking-tight text-surface-900 dark:text-white">
        {value}
      </div>

      <footer class="flex items-end justify-between gap-3">
        <Sparkline data={sparklineData} colorClass={accent.line} />
        <TrendLabel changePct={changePct} direction={direction} metric={type} />
      </footer>
    </article>
  );
}

/* ---------------- helpers ---------------- */

interface Accent {
  icon: string;
  line: string;
  goodArrow: 'up' | 'down'; // for income/balance
  goodColor: string;        // tailwind class for the "good" arrow
  badColor: string;         // tailwind class for the "bad" arrow
}

function getAccent(type: MetricCardProps['type']): Accent {
  switch (type) {
    case 'income':
      return {
        icon: 'text-accent-600 dark:text-accent-400',
        line: 'text-accent-600 dark:text-accent-400',
        goodArrow: 'up',
        goodColor: 'text-accent-600 dark:text-accent-400',
        badColor: 'text-danger-600 dark:text-danger-400',
      };
    case 'expense':
      return {
        icon: 'text-danger-600 dark:text-danger-400',
        line: 'text-danger-600 dark:text-danger-400',
        goodArrow: 'down', // spending less is good
        goodColor: 'text-accent-600 dark:text-accent-400',
        badColor: 'text-danger-600 dark:text-danger-400',
      };
    case 'balance':
    default:
      return {
        icon: 'text-primary-600 dark:text-primary-400',
        line: 'text-primary-600 dark:text-primary-400',
        goodArrow: 'up',
        goodColor: 'text-accent-600 dark:text-accent-400',
        badColor: 'text-danger-600 dark:text-danger-400',
      };
  }
}

function CardIcon({ name, class: className }: { name: 'trending-up' | 'trending-down' | 'wallet'; class?: string }) {
  switch (name) {
    case 'trending-up':
      return (
        <svg class={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      );
    case 'trending-down':
      return (
        <svg class={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
        </svg>
      );
    case 'wallet':
    default:
      return (
        <svg class={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13h.01" />
        </svg>
      );
  }
}

/**
 * Hand-rolled inline SVG sparkline. No new deps.
 *
 * Math: min/max normalize (including 0 so flat trends don't disappear),
 * map to x∈[0,60] and y∈[20,0] in a 60×20 viewBox. Edge cases: empty
 * data renders nothing, single point at center, all-equal values
 * render a flat line at y=10.
 */
function Sparkline({ data, colorClass }: { data: number[]; colorClass: string }) {
  if (!data || data.length === 0) return null;

  const min = Math.min(...data, 0);
  const max = Math.max(...data, 0);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1 || 1)) * 60;
      const y = 20 - ((v - min) / range) * 20;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  // For the area fill: same points, closed back to the baseline.
  const areaPoints = `${points} 60,20 0,20`;

  // Map a tailwind color class to an actual stroke (use currentColor so the
  // parent's text-* class flows through via the `colorClass` wrapper).
  return (
    <svg
      viewBox="0 0 60 20"
      preserveAspectRatio="none"
      class={`h-10 w-24 ${colorClass}`}
      aria-hidden="true"
    >
      <polygon points={areaPoints} fill="currentColor" fill-opacity="0.1" />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

/**
 * Trend label: "↗ +12.3%" with semantic coloring.
 * For income/balance: up=good (green), down=bad (red).
 * For expense:       up=bad (red),   down=good (green).
 * No-data: shows "—" in neutral.
 * Negligible change: shows "0.0%" with no arrow.
 */
function TrendLabel({
  changePct,
  direction,
  metric,
}: {
  changePct: number | null;
  direction: 'up' | 'down' | 'flat';
  metric: MetricCardProps['type'];
}) {
  // No data case
  if (changePct === null) {
    return (
      <span class="text-xs font-medium text-surface-400 dark:text-surface-500">— vs mes anterior</span>
    );
  }

  // Negligible change
  if (direction === 'flat') {
    return (
      <span class="text-xs font-medium text-surface-500 dark:text-surface-400">0.0% vs mes anterior</span>
    );
  }

  // Determine if this direction is "good" for the metric
  const accent = getAccent(metric);
  const isGood = (metric === 'expense' ? direction === 'down' : direction === 'up');
  const color = isGood ? accent.goodColor : accent.badColor;
  const arrow = direction === 'up' ? '↗' : '↘';
  const sign = changePct > 0 ? '+' : '';

  return (
    <span class={`inline-flex items-center gap-1 text-xs font-semibold ${color}`}>
      <span aria-hidden="true">{arrow}</span>
      <span>
        {sign}
        {changePct.toFixed(1)}% vs mes anterior
      </span>
    </span>
  );
}
