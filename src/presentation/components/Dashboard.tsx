import { useState, useEffect } from 'preact/hooks';
import MetricCard from './MetricCard';
import TransactionList from './TransactionList';
import TransactionForm from './TransactionForm';
import ExpenseChart from './ExpenseChart';
import CategoryChart from './CategoryChart';
import type { Transaction } from '../../domain/entities/Transaction';

// Mock hook para demo - en producción usar el real
function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load from localStorage
    const stored = localStorage.getItem('finance-dashboard-transactions');
    if (stored) {
      try {
        setTransactions(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse transactions', e);
      }
    }
    setIsLoading(false);
  }, []);

  const saveToStorage = (data: Transaction[]) => {
    localStorage.setItem('finance-dashboard-transactions', JSON.stringify(data));
    setTransactions(data);
  };

  const addTransaction = (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    saveToStorage([...transactions, newTx]);
  };

  const updateTransaction = (id: string, data: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => {
    saveToStorage(transactions.map(t => t.id === id ? { ...t, ...data } : t));
  };

  const deleteTransaction = (id: string) => {
    saveToStorage(transactions.filter(t => t.id !== id));
  };

  const totals = {
    income: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
    expense: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
    balance: 0,
  };
  totals.balance = totals.income - totals.expense;

  return {
    transactions,
    isLoading,
    totals,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  };
}

export default function Dashboard() {
  const { transactions, isLoading, totals, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

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

    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const date = new Date(t.date);
        const key = date.toLocaleDateString('es-AR', { month: 'short' });
        if (key in months) {
          months[key] += t.amount;
        }
      });

    return Object.entries(months).map(([month, amount]) => ({ month, amount }));
  };

  // Calculate category breakdown
  const getCategoryData = () => {
    const categories: Record<string, number> = {};
    const colors: Record<string, string> = {
      'Alimentación': '#10b981',
      'Transporte': '#3b82f6',
      'Servicios': '#8b5cf6',
      'Entretenimiento': '#f59e0b',
      'Salud': '#ef4444',
      'Educación': '#06b6d4',
      'Otro': '#6b7280',
    };

    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
      });

    return Object.entries(categories).map(([category, amount]) => ({
      category,
      amount,
      color: colors[category] || '#6b7280',
    }));
  };

  const handleSave = (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (editingTransaction) {
      updateTransaction(editingTransaction.id, data);
    } else {
      addTransaction(data);
    }
    setShowForm(false);
    setEditingTransaction(null);
  };

  if (isLoading) {
    return (
      <div class="flex items-center justify-center h-64">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div class="space-y-8">
      {/* Metrics Cards */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Balance Total"
          value={formatCurrency(totals.balance)}
          type="balance"
        />
        <MetricCard
          title="Ingresos del Mes"
          value={formatCurrency(totals.income)}
          type="income"
        />
        <MetricCard
          title="Gastos del Mes"
          value={formatCurrency(totals.expense)}
          type="expense"
        />
      </div>

      {/* Charts */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpenseChart data={getMonthlyData()} />
        <CategoryChart data={getCategoryData()} />
      </div>

      {/* Transactions */}
      <div>
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-semibold text-gray-800">Transacciones</h2>
          <button
            onClick={() => setShowForm(true)}
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Nueva Transacción
          </button>
        </div>

        <TransactionList
          transactions={transactions}
          onEdit={(t) => {
            setEditingTransaction(t);
            setShowForm(true);
          }}
          onDelete={deleteTransaction}
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
    </div>
  );
}