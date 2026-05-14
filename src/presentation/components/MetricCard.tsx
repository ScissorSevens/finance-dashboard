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
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: 'text-green-500',
          text: 'text-green-700',
        };
      case 'expense':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-500',
          text: 'text-red-700',
        };
      case 'balance':
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-500',
          text: 'text-blue-700',
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
    <div class={`rounded-lg shadow p-6 border ${styles.bg} ${styles.border}`}>
      <div class="flex items-center justify-between mb-2">
        <span class={`text-sm font-medium ${styles.text}`}>{title}</span>
        <span class={`text-xl ${styles.icon}`}>{getIcon()}</span>
      </div>
      <div class={`text-2xl font-bold ${styles.text}`}>{value}</div>
    </div>
  );
}