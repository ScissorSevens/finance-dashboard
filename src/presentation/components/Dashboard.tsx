import { useState, useMemo } from 'preact/hooks';
import MetricCard from './MetricCard';
import TransactionList from './TransactionList';
import TransactionForm from './TransactionForm';
import ExpenseChart from './ExpenseChart';
import CategoryChart from './CategoryChart';
import BalanceBurndownChart from './BalanceBurndownChart';
import ProjectionCard from './ProjectionCard';
import MonthlyComparison from './MonthlyComparison';
import CategoryManager from './CategoryManager';
import AuthControls from './AuthControls';
import MigrationDialog from './MigrationDialog';
import ClerkProviderWrapper from '../../infrastructure/auth/ClerkProviderWrapper';
import { useFinancialMetrics } from '../../application/hooks/useFinancialMetrics';
import { useCategories } from '../../application/hooks/useCategories';
import { useTransactions } from '../../application/hooks/useTransactions';
import { useAuth } from '../../application/hooks/useAuth';
import { runMigration } from '../../application/services/SpanishKeyMigration';
import {
	calculateMonthlyProjection,
	calculateCategoryProjections,
	calculateTrendAnalysis,
} from '../../application/services/BalanceProjectionService';
import type { Transaction } from '../../domain/entities/Transaction';

/**
 * Root dashboard component.
 *
 * Composition (Phase 3):
 * 1. `<ClerkProviderWrapper>` — gates the entire Preact tree on the
 *    ClerkProvider (no-op when the publishable key is missing).
 * 2. The `useAuth()` hook resolves the Clerk session.
 * 3. The `useTransactions()` and `useCategories()` hooks now use the
 *    `StorageProvider` to pick Supabase (when authenticated) or
 *    localStorage (when offline / not configured).
 * 4. `<AuthControls>` is the login/logout UI.
 * 5. `<MigrationDialog>` appears when the user signs in with local
 *    data and migration hasn't been completed yet.
 *
 * Spec scenarios covered: every auth-supabase scenario hinges on this
 * composition being correct. See MigrationDialog for the migration
 * scenarios and useAuth for the auth UI ones.
 */
export default function Dashboard() {
	// Reference DASHBOARD_BUILD_SENTINEL to prevent Vite from tree-shaking it.
	// The string itself is the cache-bust marker — change it to force a new bundle hash.
	if (typeof window !== 'undefined' && (window as unknown as { __DASHBOARD_BUILD__?: string }).__DASHBOARD_BUILD__ !== DASHBOARD_BUILD_SENTINEL) {
		(window as unknown as { __DASHBOARD_BUILD__?: string }).__DASHBOARD_BUILD__ = DASHBOARD_BUILD_SENTINEL;
	}
	return (
		<ClerkProviderWrapper>
			<DashboardContent />
		</ClerkProviderWrapper>
	);
}

/**
 * Inner component — separated from `Dashboard` so the ClerkProvider
 * context is established before any of the Clerk-dependent hooks
 * (useUser, useSession) run.
 */
function DashboardContent() {
	const { transactions, isLoading, isAuthResolved, totals, addTransaction, updateTransaction, deleteTransaction, loadTransactions } = useTransactions();
	const { allCategories, loadCategories } = useCategories();
	const { isSignedIn, isSupabaseConfigured } = useAuth();
	const [showForm, setShowForm] = useState(false);
	const [showCategoryManager, setShowCategoryManager] = useState(false);
	const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
	const [migrationNotice, setMigrationNotice] = useState<string | null>(null);

	// New complex features
	const metrics = useFinancialMetrics(transactions.value, totals.value.balance);

	/**
	 * Phase 2 projections (per spec `projections.spec`):
	 *
	 * - `monthlyProjection` — last 3 historical months + 6 future months,
	 *   using the average of the most recent 3 months as the projected rate.
	 *   Consumed by the Monthly tab of `<ProjectionCard>` → `MonthlyProjectionChart`.
	 *
	 * - `categoryProjections` — per-expense-category breakdown with
	 *   `totalSpent`, `avgMonthly`, and `daysRemaining`. Depends on the
	 *   full category list (from `useCategories()`) so the bar chart in
	 *   the Category tab can label customs correctly.
	 *
	 * - `trendAnalysis` — direction + momentum of the recent expense
	 *   series, surfaced as a hint in the Overview tab when non-null.
	 *
	 * These are recomputed only when the underlying signals change. They
	 * are intentionally NOT inside `useFinancialMetrics` because they
	 * need `allCategories` (which that hook does not know about).
	 */
	const monthlyProjection = useMemo(
		() => calculateMonthlyProjection(transactions.value, 6),
		[transactions.value]
	);
	const categoryProjections = useMemo(
		() => calculateCategoryProjections(transactions.value, allCategories.value, totals.value.balance),
		[transactions.value, allCategories.value, totals.value.balance]
	);
	const trendAnalysis = useMemo(
		() => calculateTrendAnalysis(transactions.value, 3),
		[transactions.value]
	);

	/**
	 * Resolve a stable color for a category by name. Defaults come from
	 * the static color map in Transaction.ts; custom categories come
	 * from the live category list.
	 */
	const getCategoryColor = (name: string): string => {
		const fromCategory = allCategories.value.find((c) => c.name === name);
		if (fromCategory) return fromCategory.color;
		const fallback: Record<string, string> = {
			food: '#f87171',
			transport: '#fb923c',
			housing: '#f59e0b',
			utilities: '#eab308',
			entertainment: '#a855f7',
			health: '#ec4899',
			education: '#3b82f6',
			shopping: '#6366f1',
			other_expense: '#8b5cf6',
		};
		return fallback[name] ?? '#6b7280';
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('es-AR', {
			style: 'currency',
			currency: 'ARS',
		}).format(amount);
	};

	// Calculate monthly expense data for chart
	const getMonthlyData = () => {
		const months: Record<string, number> = {};
		const now = new Date();

		for (let i = 5; i >= 0; i--) {
			const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const key = date.toLocaleDateString('es-AR', { month: 'short' });
			months[key] = 0;
		}

		transactions.value
			.filter((t) => t.type === 'expense')
			.forEach((t) => {
				const date = new Date(t.date);
				const key = date.toLocaleDateString('es-AR', { month: 'short' });
				if (key in months) {
					months[key] += t.amount;
				}
			});

		return Object.entries(months).map(([month, amount]) => ({ month, amount }));
	};

	// Calculate monthly income data for chart
	const getMonthlyIncomeData = () => {
		const months: Record<string, number> = {};
		const now = new Date();

		for (let i = 5; i >= 0; i--) {
			const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const key = date.toLocaleDateString('es-AR', { month: 'short' });
			months[key] = 0;
		}

		transactions.value
			.filter((t) => t.type === 'income')
			.forEach((t) => {
				const date = new Date(t.date);
				const key = date.toLocaleDateString('es-AR', { month: 'short' });
				if (key in months) {
					months[key] += t.amount;
				}
			});

		return Object.entries(months).map(([month, amount]) => ({ month, amount }));
	};

	// Calculate category breakdown, using the live category list for colors.
	const getCategoryData = () => {
		const categories: Record<string, number> = {};

		transactions.value
			.filter((t) => t.type === 'expense')
			.forEach((t) => {
				categories[t.category] = (categories[t.category] || 0) + t.amount;
			});

		return Object.entries(categories).map(([category, amount]) => ({
			category,
			amount,
			color: getCategoryColor(category),
		}));
	};

	const handleSave = (data: Omit<Transaction, 'id' | 'createdAt'>) => {
		if (editingTransaction) {
			void updateTransaction(editingTransaction.id, data);
		} else {
			void addTransaction(data);
		}
		setShowForm(false);
		setEditingTransaction(null);
	};

	const handleMigrationComplete = () => {
		setMigrationNotice('Migración completada. Sincronizando datos…');
		// After migration, both transactions AND categories live in Supabase.
		// We MUST reload both, otherwise the in-memory `categories` signal
		// stays in its pre-migration state (stale local data still in
		// memory even though localStorage was just cleared by the
		// migration), and the user sees the categories "disappear" the
		// next time the dashboard re-reads from the (now-empty) local
		// source. See MigrationService.clearLocalData().
		void Promise.all([loadTransactions(), loadCategories()]);
	};

	const handleMigrationDeclined = () => {
		setMigrationNotice('Seguís en modo local. Tus datos quedan en este navegador.');
	};

	// Loading state — show the spinner until the first auth resolution
	// AND the first transaction load both finish. This avoids flashing
	// the "no data" UI on sign-in.
	if (!isAuthResolved || (isLoading.value && transactions.value.length === 0)) {
		return (
			<div class="flex items-center justify-center h-64">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	return (
		<div class="space-y-8">
			{/* Top bar: auth controls + storage mode hint */}
			<div class="flex items-center justify-between gap-3 flex-wrap">
				<div class="flex items-center gap-3">
					{isSignedIn && isSupabaseConfigured && (
						<span class="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
							<span class="w-2 h-2 bg-green-500 rounded-full"></span>
							Sincronizado en la nube
						</span>
					)}
					{isSignedIn && !isSupabaseConfigured && (
						<span class="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
							<span class="w-2 h-2 bg-amber-500 rounded-full"></span>
							Modo local (sesión activa, sin Supabase)
						</span>
					)}
					{!isSignedIn && (
						<span class="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-1">
							<span class="w-2 h-2 bg-gray-400 rounded-full"></span>
							Modo local
						</span>
					)}
				</div>
				<AuthControls />
			</div>

			{/* Migration notice (transient) */}
			{migrationNotice && (
				<div class="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
					<span>{migrationNotice}</span>
					<button
						type="button"
						onClick={() => setMigrationNotice(null)}
						class="text-blue-600 hover:text-blue-800 ml-3"
						aria-label="Cerrar"
					>
						×
					</button>
				</div>
			)}

			{/* Metrics Cards */}
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				<MetricCard
					title="Balance Total"
					value={formatCurrency(totals.value.balance)}
					type="balance"
				/>
				<MetricCard
					title="Ingresos del Mes"
					value={formatCurrency(totals.value.income)}
					type="income"
				/>
				<MetricCard
					title="Gastos del Mes"
					value={formatCurrency(totals.value.expense)}
					type="expense"
				/>
			</div>

			{/* Charts */}
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<ExpenseChart data={getMonthlyData()} incomeData={getMonthlyIncomeData()} />
				<CategoryChart data={getCategoryData()} />
			</div>

			{/* Balance Burndown Chart */}
			<BalanceBurndownChart
				dates={metrics.runningBalance.dates}
				balances={metrics.runningBalance.balances}
			/>

			{/* Projection & Monthly Comparison */}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<ProjectionCard
					days={metrics.projection.days}
					date={metrics.projection.date}
					message={metrics.projection.message}
					dailyAverage={metrics.dailyAverage}
					currentBalance={totals.value.balance}
					monthlyData={monthlyProjection}
					categoryData={categoryProjections}
					trend={trendAnalysis}
				/>
				<MonthlyComparison
					currentMonth={metrics.monthlyComparison.currentMonth}
					previousMonth={metrics.monthlyComparison.previousMonth}
					difference={metrics.monthlyComparison.difference}
					percentage={metrics.monthlyComparison.percentage}
					trend={metrics.monthlyComparison.trend}
				/>
			</div>

			{/* Transactions */}
			<div>
				<div class="flex flex-wrap justify-between items-center gap-3 mb-6">
					<h2 class="text-xl font-semibold text-gray-800">Transacciones</h2>
					<div class="flex gap-2">
						<button
							onClick={() => setShowCategoryManager(true)}
							class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
						>
							Gestionar categorías
						</button>
						<button
							onClick={() => setShowForm(true)}
							class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
						>
							+ Nueva Transacción
						</button>
					</div>
				</div>

				<TransactionList
					transactions={transactions.value}
					onEdit={(t) => {
						setEditingTransaction(t);
						setShowForm(true);
					}}
					onDelete={(id) => void deleteTransaction(id)}
				/>
			</div>

			{/* Modal Form */}
			{showForm && (
				<TransactionForm
					transaction={editingTransaction}
					onSave={handleSave}
					onClose={() => {
						setShowForm(false);
						setEditingTransaction(null);
					}}
				/>
			)}

			{/* Category Manager */}
			{showCategoryManager && (
				<CategoryManager
					open={showCategoryManager}
					onClose={() => setShowCategoryManager(false)}
				/>
			)}

			{/* Migration Dialog — self-gated, only renders when applicable */}
			<MigrationDialog
				onMigrated={handleMigrationComplete}
				onDeclined={handleMigrationDeclined}
				onError={(msg) => setMigrationNotice(`Migración falló: ${msg}`)}
			/>
		</div>
	);
}

// Re-export so existing imports `runMigration` from this file still work
// (some other components may have imported it as a side effect of the
// previous Dashboard mock — keeping it here avoids breaking those).
export { runMigration };

// Build sentinel: changing this string forces Vite to emit a new chunk hash
// so GitHub Pages CDN serves the fresh bundle (this version: 2026-06-01-no-cache-meta-v4).
export const DASHBOARD_BUILD_SENTINEL = '2026-06-01-no-cache-meta-v4';
