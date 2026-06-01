import { useState, useMemo } from 'preact/hooks';
import { useCategories } from '../../application/hooks/useCategories';
import { CategoryLabels } from '../../domain/entities/Transaction';
import type { TransactionCategory } from '../../domain/entities/Transaction';
import type { Category, CategoryType } from '../../domain/entities/Category';

interface CategoryManagerProps {
	open: boolean;
	onClose: () => void;
}

interface FormState {
	id: string | null;
	name: string;
	type: CategoryType;
	color: string;
}

const EMPTY_FORM: FormState = {
	id: null,
	name: '',
	type: 'expense',
	color: '#3b82f6',
};

const COLOR_PALETTE = [
	'#ef4444',
	'#f97316',
	'#f59e0b',
	'#eab308',
	'#84cc16',
	'#10b981',
	'#14b8a6',
	'#06b6d4',
	'#3b82f6',
	'#6366f1',
	'#8b5cf6',
	'#a855f7',
	'#ec4899',
	'#6b7280',
];

/**
 * Resolve a Spanish display label for default categories.
 * Custom categories: the name itself IS the label.
 */
function displayLabel(category: Category): string {
	if (category.isDefault) {
		return CategoryLabels[category.name as TransactionCategory] ?? category.name;
	}
	return category.name;
}

/**
 * CategoryManager — modal CRUD UI for categories.
 *
 * Covers spec scenarios:
 * - View categories (list with name, color, type)
 * - Create category (form with name, type, color picker)
 * - Edit category (form pre-filled with current values)
 * - Delete category (with isDefault guard — defaults cannot be deleted)
 * - Color picker (curated palette + visual preview)
 */
export default function CategoryManager({ open, onClose }: CategoryManagerProps) {
	const { allCategories, addCategory, updateCategory, deleteCategory, isLoading, error } =
		useCategories();
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [formError, setFormError] = useState<string | null>(null);
	const [filterType, setFilterType] = useState<CategoryType | 'all'>('all');
	const [showForm, setShowForm] = useState(false);

	// Sorted, filtered list
	const visibleCategories = useMemo<Category[]>(() => {
		const list = filterType === 'all' ? allCategories.value : allCategories.value.filter((c) => c.type === filterType);
		return [...list].sort((a, b) => {
			if (a.type !== b.type) return a.type === 'income' ? -1 : 1;
			if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
			return displayLabel(a).localeCompare(displayLabel(b));
		});
	}, [allCategories.value, filterType]);

	if (!open) return null;

	const openCreateForm = () => {
		setForm(EMPTY_FORM);
		setFormError(null);
		setShowForm(true);
	};

	const openEditForm = (category: Category) => {
		setForm({
			id: category.id,
			name: displayLabel(category),
			type: category.type,
			color: category.color,
		});
		setFormError(null);
		setShowForm(true);
	};

	const cancelForm = () => {
		setShowForm(false);
		setForm(EMPTY_FORM);
		setFormError(null);
	};

	const submitForm = async (e: Event) => {
		e.preventDefault();
		setFormError(null);

		if (!form.name.trim()) {
			setFormError('El nombre es requerido');
			return;
		}
		if (!/^#[0-9a-fA-F]{6}$/.test(form.color)) {
			setFormError('Color inválido');
			return;
		}

		try {
			if (form.id) {
				// Edit mode: store the slug form for default categories
				// (English key), or the typed name for customs.
				const original = allCategories.value.find((c) => c.id === form.id);
				if (!original) {
					setFormError('Categoría no encontrada');
					return;
				}
				const updatedName = original.isDefault ? original.name : form.name.trim();
				await updateCategory(form.id, {
					name: updatedName,
					type: form.type,
					color: form.color,
				});
			} else {
				await addCategory({
					name: form.name.trim(),
					type: form.type,
					color: form.color,
					isDefault: false,
				});
			}
			cancelForm();
		} catch (err) {
			setFormError(err instanceof Error ? err.message : 'Error al guardar la categoría');
		}
	};

	const handleDelete = async (category: Category) => {
		const label = displayLabel(category);
		const confirmMsg = category.isDefault
			? `Las categorías predeterminadas no se pueden eliminar.`
			: `¿Eliminar la categoría "${label}"? Esta acción no se puede deshacer.`;
		if (category.isDefault) {
			// Per spec: system rejects deletion of defaults. No prompt needed.
			alert(confirmMsg);
			return;
		}
		if (!confirm(confirmMsg)) return;
		try {
			await deleteCategory(category.id);
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Error al eliminar la categoría');
		}
	};

	return (
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
				{/* Header */}
				<div class="flex justify-between items-center p-6 border-b border-gray-200">
					<h2 class="text-xl font-semibold text-gray-900">Gestionar Categorías</h2>
					<button
						onClick={onClose}
						class="text-gray-400 hover:text-gray-600 text-2xl leading-none"
					>
						×
					</button>
				</div>

				{/* Toolbar */}
				<div class="flex flex-wrap items-center gap-3 p-6 pb-4">
					<select
						value={filterType}
						onChange={(e) => setFilterType((e.target as HTMLSelectElement).value as CategoryType | 'all')}
						class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					>
						<option value="all">Todos los tipos</option>
						<option value="income">Ingresos</option>
						<option value="expense">Gastos</option>
					</select>
					<button
						type="button"
						onClick={openCreateForm}
						class="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
					>
						+ Nueva categoría
					</button>
				</div>

				{/* Error banner */}
				{error && (
					<div class="mx-6 mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
						{error}
					</div>
				)}

				{/* List */}
				<div class="flex-1 overflow-y-auto px-6 pb-6">
					{isLoading && visibleCategories.length === 0 ? (
						<div class="text-center py-8 text-gray-400">Cargando categorías…</div>
					) : visibleCategories.length === 0 ? (
						<div class="text-center py-8 text-gray-400">No hay categorías para mostrar</div>
					) : (
						<ul class="divide-y divide-gray-100">
							{visibleCategories.map((category) => (
								<li key={category.id} class="flex items-center gap-3 py-3">
									<span
										class="inline-block w-6 h-6 rounded-full border border-gray-200 flex-shrink-0"
										style={{ backgroundColor: category.color }}
										aria-label={`Color ${category.color}`}
									/>
									<div class="flex-1 min-w-0">
										<div class="font-medium text-gray-900 truncate">
											{displayLabel(category)}
										</div>
										<div class="text-xs text-gray-500 flex gap-2">
											<span>
												{category.type === 'income' ? 'Ingreso' : 'Gasto'}
											</span>
											{category.isDefault && (
												<span class="text-blue-600">• Predeterminada</span>
											)}
										</div>
									</div>
									<button
										type="button"
										onClick={() => openEditForm(category)}
										class="text-sm text-blue-600 hover:text-blue-800 px-2"
									>
										Editar
									</button>
									<button
										type="button"
										onClick={() => handleDelete(category)}
										class={`text-sm px-2 ${
											category.isDefault
												? 'text-gray-400 cursor-not-allowed'
												: 'text-red-600 hover:text-red-800'
										}`}
										title={category.isDefault ? 'No se puede eliminar una categoría predeterminada' : 'Eliminar'}
									>
										Eliminar
									</button>
								</li>
							))}
						</ul>
					)}
				</div>

				{/* Form modal (nested) */}
				{showForm && (
					<div class="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4">
						<form
							onSubmit={submitForm}
							class="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4"
						>
							<h3 class="text-lg font-semibold text-gray-900">
								{form.id ? 'Editar categoría' : 'Nueva categoría'}
							</h3>

							{formError && (
								<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
									{formError}
								</div>
							)}

							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
								<select
									value={form.type}
									onChange={(e) =>
										setForm({ ...form, type: (e.target as HTMLSelectElement).value as CategoryType })
									}
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								>
									<option value="expense">Gasto</option>
									<option value="income">Ingreso</option>
								</select>
							</div>

							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
								<input
									type="text"
									value={form.name}
									onInput={(e) => setForm({ ...form, name: (e.target as HTMLInputElement).value })}
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									placeholder="Ej: Mi hobby"
									disabled={Boolean(form.id && allCategories.value.find((c) => c.id === form.id)?.isDefault)}
								/>
								{form.id && allCategories.value.find((c) => c.id === form.id)?.isDefault && (
									<p class="mt-1 text-xs text-gray-500">
										El nombre de las categorías predeterminadas está bloqueado para mantener la
										consistencia con las migraciones de claves.
									</p>
								)}
							</div>

							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">Color</label>
								<div class="flex flex-wrap gap-2">
									{COLOR_PALETTE.map((color) => (
										<button
											key={color}
											type="button"
											onClick={() => setForm({ ...form, color })}
											class={`w-8 h-8 rounded-full border-2 transition-all ${
												form.color === color
													? 'border-gray-900 scale-110'
													: 'border-gray-200 hover:border-gray-400'
											}`}
											style={{ backgroundColor: color }}
											aria-label={`Color ${color}`}
										/>
									))}
								</div>
								<div class="mt-2 flex items-center gap-2">
									<span
										class="inline-block w-4 h-4 rounded-full border border-gray-200"
										style={{ backgroundColor: form.color }}
									/>
									<code class="text-xs text-gray-500">{form.color}</code>
								</div>
							</div>

							<div class="flex gap-3 pt-2">
								<button
									type="button"
									onClick={cancelForm}
									class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
								>
									Cancelar
								</button>
								<button
									type="submit"
									class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
								>
									Guardar
								</button>
							</div>
						</form>
					</div>
				)}
			</div>
		</div>
	);
}
