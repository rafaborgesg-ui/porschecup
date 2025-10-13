import { Cloud, CloudOff } from 'lucide-react';
import { useSupabaseSync } from '../utils/useSupabaseSync';

export function SyncStatus() {
  const { isOnline } = useSupabaseSync();

  return (
    <div className="px-4 py-2 border-t border-gray-800">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        {isOnline ? (
          <>
            <Cloud size={14} className="text-green-500" />
            <span>Sincronizado</span>
          </>
        ) : (
          <>
            <CloudOff size={14} className="text-gray-600" />
            <span>Modo Local</span>
          </>
        )}
      </div>
    </div>
  );
}
