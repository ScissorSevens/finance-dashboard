import { formatCurrencyARS } from '../../application/services/BalanceProjectionService';

interface ProjectionCardProps {
  days: number;
  date: string | null;
  message: string;
  dailyAverage: number;
  currentBalance: number;
}

export default function ProjectionCard({ 
  days, 
  date, 
  message, 
  dailyAverage,
  currentBalance 
}: ProjectionCardProps) {
  const getStatusColor = () => {
    if (currentBalance <= 0) return 'bg-red-50 border-red-200 text-red-700';
    if (days <= 7) return 'bg-yellow-50 border-yellow-200 text-yellow-700';
    return 'bg-blue-50 border-blue-200 text-blue-700';
  };

  const getIcon = () => {
    if (currentBalance <= 0) return '⚠️';
    if (days <= 7) return '⏰';
    return '📅';
  };

  return (
    <div class={`rounded-lg shadow p-6 border ${getStatusColor()}`}>
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">Proyección de Gastos</h3>
        <span class="text-2xl">{getIcon()}</span>
      </div>
      
      <div class="space-y-3">
        <div>
          <p class="text-sm opacity-75">Promedio diario de gastos</p>
          <p class="text-xl font-bold">{formatCurrencyARS(dailyAverage)}</p>
        </div>
        
        <div>
          <p class="text-sm opacity-75">Balance actual</p>
          <p class="text-xl font-bold">{formatCurrencyARS(currentBalance)}</p>
        </div>
        
        <hr class="border-current opacity-20" />
        
        <div>
          <p class="text-sm opacity-75">Días restantes estimado</p>
          <p class="text-2xl font-bold">
            {currentBalance <= 0 ? 'Sin fondos' : 
             dailyAverage <= 0 ? 'Sin gastos' :
             `${days} días`}
          </p>
          {date && currentBalance > 0 && (
            <p class="text-sm opacity-75">
              Hasta el {new Date(date).toLocaleDateString('es-AR', { 
                day: 'numeric', 
                month: 'long' 
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}