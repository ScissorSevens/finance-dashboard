import { useState, useEffect } from 'preact/hooks';
import { useAuth } from '../../application/hooks/useAuth';
import {
	createMigrationService,
	MigrationError,
	type MigrationState,
	type MigrationProgress,
} from '../../application/services/MigrationService';

interface MigrationDialogProps {
	/**
	 * Called when the user accepts and migration completes successfully.
	 * The dashboard re-reads from Supabase after this.
	 */
	onMigrated?: () => void;
	/**
	 * Called when the user declines. The dashboard stays in localStorage mode.
	 */
	onDeclined?: () => void;
	/**
	 * Called when migration fails. The dashboard stays in localStorage mode
	 * and shows the error.
	 */
	onError?: (message: string) => void;
}

/**
 * Modal dialog shown on first sign-in when localStorage has data.
 *
 * Spec scenarios covered:
 * - Data exists → dialog shown with counts ("Found X transactions, Y categories")
 * - User accepts → progress UI ("Sincronizando X..."), then success
 * - User declines → close, dual-mode active
 * - Migration partial failure → error message, localStorage preserved
 *
 * The dialog auto-detects the local state on mount and only renders
 * itself when there is data to migrate AND the user is signed in AND
 * the migration hasn't already been completed. The parent (Dashboard)
 * is responsible for mounting this dialog when an authenticated
 * session is active.
 */
export default function MigrationDialog({ onMigrated, onDeclined, onError }: MigrationDialogProps) {
	const { isLoaded, isSignedIn, userId, clerkJwt, isSupabaseConfigured, isClerkConfigured } = useAuth();
	const [state, setState] = useState<MigrationState | null>(null);
	const [progress, setProgress] = useState<MigrationProgress | null>(null);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [running, setRunning] = useState(false);

	// Detect localStorage state when the user becomes eligible.
	useEffect(() => {
		if (!isLoaded) return;
		if (!isSignedIn || !userId) return;
		if (!isSupabaseConfigured) return; // nothing to migrate to
		let cancelled = false;
		(async () => {
			const svc = createMigrationService();
			const detected = await svc.detect();
			if (cancelled) return;
			setState(detected);
		})();
		return () => {
			cancelled = true;
		};
	}, [isLoaded, isSignedIn, userId, isSupabaseConfigured]);

	if (!isLoaded) return null;
	if (!isSignedIn) return null;
	if (!isClerkConfigured || !isSupabaseConfigured) return null;
	if (!state || !state.hasLocalStorageData) return null;
	if (state.isMigrationComplete) return null;

	const handleMigrate = async () => {
		if (!userId) return;
		setRunning(true);
		setErrorMsg(null);
		setProgress(null);
		const svc = createMigrationService();
		try {
			await svc.migrateAll(userId, clerkJwt, (p) => setProgress(p));
			setRunning(false);
			setProgress({ phase: 'done', processed: 0, total: 0, message: 'Migración completada' });
			onMigrated?.();
		} catch (e) {
			const msg = e instanceof MigrationError ? e.message : (e as Error).message;
			setErrorMsg(msg);
			setRunning(false);
			onError?.(msg);
		}
	};

	const handleDecline = () => {
		const svc = createMigrationService();
		svc.markDeclined();
		onDeclined?.();
	};

	return (
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
				{/* Header */}
				<div>
					<h2 class="text-xl font-semibold text-gray-900">Sincronizar con la nube</h2>
					<p class="mt-1 text-sm text-gray-600">
						Encontramos datos guardados localmente en este navegador. ¿Querés sincronizarlos con
						tu cuenta en la nube para verlos desde otros dispositivos?
					</p>
				</div>

				{/* Stats */}
				<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900 space-y-1">
					<div>
						<strong>{state.transactionCount}</strong> transacción
						{state.transactionCount === 1 ? '' : 'es'}
					</div>
					<div>
						<strong>{state.categoryCount}</strong> categoría
						{state.categoryCount === 1 ? '' : 's'}
					</div>
				</div>

				{/* Progress */}
				{progress && (
					<div class="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
						<div class="flex items-center gap-2">
							{progress.phase !== 'done' && (
								<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
							)}
							<span>{progress.message}</span>
						</div>
					</div>
				)}

				{/* Error */}
				{errorMsg && (
					<div class="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
						<div class="font-semibold mb-1">Error de migración</div>
						<div>{errorMsg}</div>
						<div class="mt-2 text-xs text-red-600">
							Tus datos locales siguen intactos. Podés reintentar más tarde.
						</div>
					</div>
				)}

				{/* Actions */}
				<div class="flex gap-3 pt-2">
					<button
						type="button"
						onClick={handleDecline}
						disabled={running}
						class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
					>
						Usar local
					</button>
					<button
						type="button"
						onClick={handleMigrate}
						disabled={running}
						class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
					>
						{running ? 'Sincronizando…' : 'Sincronizar'}
					</button>
				</div>
			</div>
		</div>
	);
}
