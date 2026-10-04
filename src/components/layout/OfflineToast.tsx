import React from 'react';
import { useOnlineStatus } from '../../hooks/usePWAInstall';
import { WifiOff } from 'lucide-react';

export const OfflineToast: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <aside
      aria-label="Offline Mode Notification"
      className="fixed bottom-20 md:bottom-6 right-4 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#4E562F] text-[#FAF8F2] text-xs font-semibold shadow-lg border border-[#FAF8F2]/20 backdrop-blur-md animate-fade-in"
    >
      <WifiOff className="w-4 h-4 text-[#E4EAB8]" />
      <span>Offline Mode · Using local journal</span>
    </aside>
  );
};
