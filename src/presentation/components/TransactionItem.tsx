import type { Transaction } from '../../domain/entities/Transaction';
import { CategoryLabels, CategoryColors } from '../../domain/entities/Transaction';
import { CategoryBadge } from './CategoryBadge';

interface TransactionItemProps {
	transaction: Transaction;
	onEdit?: (transaction: Transaction) => void;
	onDelete?: (id: string) => void;
}

/**
 * Format amount with currency
 */
function formatAmount(amount: number, type: string): string {
	const prefix = type === 'income' ? '+' : '-';
	return `${prefix}$${new Intl.NumberFormat('es-CL', {
		minimumFractionDigits: 0,
	}).format(amount)}`;
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleDateString('es-CL', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
}

/**
 * TransactionItem component for displaying a single transaction
 */
export function TransactionItem({ transaction, onEdit, onDelete }: TransactionItemProps) {
	const amountColor = transaction.type === 'income' ? 'text-accent-600' : 'text-danger-600';
	const bgColor = transaction.type === 'income' ? 'bg-accent-50' : 'bg-danger-50';
	const borderColor = transaction.type === 'income' ? 'border-accent-200' : 'border-danger-200';

	return (
		<div
			class={`flex items-center justify-between p-4 rounded-lg ${bgColor} border ${borderColor} hover:shadow-md transition-shadow animate-fade-in`}
		>
			<div class="flex items-center gap-4 flex-1 min-w-0">
				<div
					class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium"
					style={{ backgroundColor: CategoryColors[transaction.category as keyof typeof CategoryColors] || '#94a3b8' }}
				>
					{transaction.type === 'income' ? '↑' : '↓'}
				</div>
				<div class="flex-1 min-w-0">
					<p class="font-medium text-surface-900 truncate">{transaction.description}</p>
					<div class="flex items-center gap-2 mt-1">
						<CategoryBadge category={transaction.category} type={transaction.type} />
						<span class="text-xs text-surface-500">•</span>
						<span class="text-xs text-surface-500">{formatDate(transaction.date)}</span>
					</div>
				</div>
			</div>
			<div class="flex items-center gap-3">
				<span class={`font-semibold ${amountColor} whitespace-nowrap`}>
					{formatAmount(transaction.amount, transaction.type)}
				</span>
				<div class="flex gap-1">
					{onEdit && (
						<button
							onClick={() => onEdit(transaction)}
							class="p-1.5 text-surface-500 hover:text-primary-600 hover:bg-surface-100 rounded transition-colors"
							aria-label="Editar transacción"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
								/>
							</svg>
						</button>
					)}
					{onDelete && (
						<button
							onClick={() => onDelete(transaction.id)}
							class="p-1.5 text-surface-500 hover:text-danger-600 hover:bg-danger-50 rounded transition-colors"
							aria-label="Eliminar transacción"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
								/>
							</svg>
						</button>
					)}
				</div>
			</div>
		</div>
	);
}