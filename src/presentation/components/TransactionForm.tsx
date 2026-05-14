import { useState } from 'preact/hooks';
import type { Transaction } from '../../domain/entities/Transaction';

interface TransactionFormProps {
  transaction?: Transaction | null;
  onSave: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

const INCOME_CATEGORIES = ['Salario', 'Freelance', 'Inversión', 'Regalo', 'Otro'];
const EXPENSE_CATEGORIES = ['Alimentación', 'Transporte', 'Servicios', 'Entretenimiento', 'Salud', 'Educación', 'Otro'];

export default function TransactionForm({ transaction, onSave, onClose }: TransactionFormProps) {
  const [description, setDescription] = useState(transaction?.description || '');
  const [amount, setAmount] = useState(transaction?.amount?.toString() || '');
  const [type, setType] = useState<'income' | 'expense'>(transaction?.type || 'expense');
  const [category, setCategory] = useState(transaction?.category || '');
  const [date, setDate] = useState(transaction?.date || new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    setError('');

    if (!description.trim()) {
      setError('La descripción es requerida');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('El monto debe ser un número positivo');
      return;
    }

    if (!category) {
      setError('La categoría es requerida');
      return;
    }

    onSave({
      description: description.trim(),
      amount: amountNum,
      type,
      category,
      date,
    });
  };

  return (
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div class="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 class="text-xl font-semibold text-gray-900">
            {transaction ? 'Editar' : 'Nueva'} Transacción
          </h2>
          <button
            onClick={onClose}
            class="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} class="p-6 space-y-4">
          {error && (
            <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={type}
              onChange={(e) => {
                setType((e.target as HTMLSelectElement).value as 'income' | 'expense');
                setCategory('');
              }}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <input
              type="text"
              value={description}
              onInput={(e) => setDescription((e.target as HTMLInputElement).value)}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: Supermercado, Taxi, Salary"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Monto</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onInput={(e) => setAmount((e.target as HTMLInputElement).value)}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory((e.target as HTMLSelectElement).value)}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleccionar categoría</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input
              type="date"
              value={date}
              onInput={(e) => setDate((e.target as HTMLInputElement).value)}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div class="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
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
    </div>
  );
}