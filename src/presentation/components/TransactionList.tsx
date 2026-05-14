import { useSignal } from '@preact/signals';
import type { Transaction } from '../../domain/entities/Transaction';

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

export default function TransactionList({ transactions, onEdit, onDelete }: TransactionListProps) {
  const filterType = useSignal<'all' | 'income' | 'expense'>('all');
  const filterCategory = useSignal<string>('all');

  const filteredTransactions = transactions.filter(t => {
    if (filterType.value !== 'all' && t.type !== filterType.value) return false;
    if (filterCategory.value !== 'all' && t.category !== filterCategory.value) return false;
    return true;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const categories = [...new Set(transactions.map(t => t.category))];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex flex-wrap gap-4 mb-6">
        <select
          value={filterType.value}
          onChange={(e) => filterType.value = (e.target as HTMLSelectElement).value as any}
          class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">Todos los tipos</option>
          <option value="income">Ingresos</option>
          <option value="expense">Gastos</option>
        </select>

        <select
          value={filterCategory.value}
          onChange={(e) => filterCategory.value = (e.target as HTMLSelectElement).value}
          class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">Todas las categorías</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {filteredTransactions.length === 0 ? (
        <div class="text-center py-8 text-gray-400">
          No hay transacciones que mostrar
        </div>
      ) : (
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-200">
                <th class="text-left py-3 px-2 text-sm font-medium text-gray-500">Fecha</th>
                <th class="text-left py-3 px-2 text-sm font-medium text-gray-500">Descripción</th>
                <th class="text-left py-3 px-2 text-sm font-medium text-gray-500">Categoría</th>
                <th class="text-right py-3 px-2 text-sm font-medium text-gray-500">Monto</th>
                <th class="text-right py-3 px-2 text-sm font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(transaction => (
                <tr key={transaction.id} class="border-b border-gray-100 hover:bg-gray-50">
                  <td class="py-3 px-2 text-sm text-gray-600">{formatDate(transaction.date)}</td>
                  <td class="py-3 px-2 text-sm text-gray-900">{transaction.description}</td>
                  <td class="py-3 px-2">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {transaction.category}
                    </span>
                  </td>
                  <td class={`py-3 px-2 text-sm font-medium text-right ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </td>
                  <td class="py-3 px-2 text-right">
                    <button
                      onClick={() => onEdit(transaction)}
                      class="text-blue-600 hover:text-blue-800 text-sm mr-3"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onDelete(transaction.id)}
                      class="text-red-600 hover:text-red-800 text-sm"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}