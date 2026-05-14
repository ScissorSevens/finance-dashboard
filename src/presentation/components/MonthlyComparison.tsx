import { formatCurrencyARS } from '../../application/services/BalanceProjectionService';

interface MonthlyComparisonProps {
  currentMonth: number;
  previousMonth: number;
  difference: number;
  percentage: number;
  trend: 'up' | 'down' | 'same';
}

export default function MonthlyComparison({ 
  currentMonth, 
  previousMonth, 
  difference, 
  percentage, 
  trend 
}: MonthlyComparisonProps) {
  const getStyles = () => {
    switch (trend) {
      case 'up':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-600',
          iconSymbol: '↑',
          message: 'aumentó'
        };
      case 'down':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: 'text-green-600',
          iconSymbol: '↓',
          message: 'disminuyó'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          icon: 'text-gray-600',
          iconSymbol: '→',
          message: 'se mantuvo'
        };
    }
  };

  const styles = getStyles();

  const hasData = previousMonth > 0;

  return (
    <div class={`rounded-lg shadow p-6 border ${styles.bg} ${styles.border}`}>
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">vs Mes Anterior</h3>
        <span class={`text-2xl ${styles.icon}`}>{styles.iconSymbol}</span>
      </div>
      
      {!hasData ? (
        <div class="text-gray-500 text-center py-4">
          <p>Sin datos del mes pasado</p>
          <p class="text-sm opacity-75">Registrá gastos para ver la comparación</p>
        </div>
      ) : (
        <div class="space-y-3">
          <div class="flex justify-between">
            <div>
              <p class="text-sm opacity-75">Mes actual</p>
              <p class="text-xl font-bold">{formatCurrencyARS(currentMonth)}</p>
            </div>
            <div class="text-right">
              <p class="text-sm opacity-75">Mes anterior</p>
              <p class="text-xl font-bold">{formatCurrencyARS(previousMonth)}</p>
            </div>
          </div>
          
          <hr class="border-current opacity-20" />
          
          <div>
            <p class="text-sm opacity-75">Diferencia</p>
            <p class={`text-2xl font-bold ${styles.icon}`}>
              {trend === 'up' ? '+' : ''}{formatCurrencyARS(difference)}
            </p>
            <p class={`text-sm ${styles.icon}`}>
              {Math.abs(percentage).toFixed(1)}% {styles.message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}