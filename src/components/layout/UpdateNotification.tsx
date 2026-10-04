import React from 'react';
import { Loader2 } from 'lucide-react';

interface UpdateNotificationProps {
  hasUpdate: boolean;
  isUpdating: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({
  hasUpdate,
  isUpdating,
  onUpdate,
  onDismiss,
}) => {
  if (!hasUpdate) return null;

  return (
    <div
      role="region"
      aria-label="Application Update Available"
      className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 max-w-sm w-[calc(100vw-2rem)] p-4 sm:p-5 bg-[#FAF8F2] text-[#282C1B] rounded-3xl shadow-2xl border border-[#4E562F]/20 animate-fade-in transition-all text-left"
    >
      <div className="flex items-start gap-3.5">
        {/* Soft Olive Badge Emblem */}
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-[#E4EAB8] text-[#3B421E] flex items-center justify-center flex-none font-bold text-sm shadow-2xs">
          ✦
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-black text-[#282C1B] tracking-tight leading-snug">
            A little update is ready ✦
          </h4>
          <p className="text-xs text-[#6A7056] mt-1 leading-relaxed">
            A newer version of EHSAAN MOVIE is ready.
          </p>

          {/* Action Buttons */}
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={onDismiss}
              disabled={isUpdating}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold text-[#6A7056] hover:bg-[#EFECE1] hover:text-[#282C1B] transition active:scale-95 disabled:opacity-50"
            >
              Not now
            </button>

            <button
              onClick={onUpdate}
              disabled={isUpdating}
              className="px-4 py-1.5 rounded-full bg-[#4E562F] hover:bg-[#3E4524] text-[#FAF8F2] text-xs font-extrabold transition shadow-xs active:scale-95 flex items-center gap-1.5 disabled:opacity-60"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E4EAB8]" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <span>Update now</span>
                  <span className="text-[#E4EAB8]">✦</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
