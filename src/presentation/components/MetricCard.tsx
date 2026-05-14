interface MetricCardProps {
  title: string;
  value: string;
  type: 'balance' | 'income' | 'expense';
}

export default function MetricCard({ title, value, type }: MetricCardProps) {
  const getStyles = () => {
    switch (type) {
      case 'income':
        return {
          bg: 'bg-green-50 dark:bg-green-900/30',
          border: 'border-green-200 dark:border-green-800',
          icon: 'text-green-500 dark:text-green-400',
          text: 'text-green-700 dark:text-green-300',
        };
      case 'expense':
        return {
          bg: 'bg-red-50 dark:bg-red-900/30',
          border: 'border-red-200 dark:border-red-800',
          icon: 'text-red-500 dark:text-red-400',
          text: 'text-red-700 dark:text-red-300',
        };
      case 'balance':
      default:
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/30',
          border: 'border-blue-200 dark:border-blue-800',
          icon: 'text-blue-500 dark:text-blue-400',
          text: 'text-blue-700 dark:text-blue-300',
        };
    }
  };

  const styles = getStyles();

  const getIcon = () => {
    switch (type) {
      case 'income':
        return '↑';
      case 'expense':
        return '↓';
      case 'balance':
      default:
        return '↔';
    }
  };

  return (
    <div class={`rounded-lg shadow-md p-6 border ${styles.bg} ${styles.border}`}>
      <div class="flex items-center justify-between mb-2">
        <span class={`text-sm font-medium ${styles.text}`}>{title}</span>
        <span class={`text-xl ${styles.icon}`}>{getIcon()}</span>
      </div>
      <div class={`text-2xl font-bold ${styles.text}`}>{value}</div>
    </div>
  );
}