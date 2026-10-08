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
      className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 max-w-sm w-[calc(100vw-2rem)] p-4 sm:p-5 bg-[var(--modal-bg)] text-[var(--text-primary)] rounded-3xl shadow-2xl border border-[var(--border-subtle)] animate-fade-in transition-all text-left"
    >
      <div className="flex items-start gap-3.5">
        {/* Soft Dynamic Badge Emblem */}
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] flex items-center justify-center flex-none font-bold text-sm shadow-2xs border border-[var(--border-subtle)]">
          ✦
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-black text-[var(--text-primary)] tracking-tight leading-snug">
            A little update is ready ✦
          </h4>
          <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
            A newer version of EHSAAN PLAY is ready to install.
          </p>

          {/* Action Buttons */}
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={onDismiss}
              disabled={isUpdating}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--chip-bg)] hover:text-[var(--text-primary)] transition active:scale-95 disabled:opacity-50"
            >
              Not now
            </button>

            <button
              onClick={onUpdate}
              disabled={isUpdating}
              className="px-4 py-1.5 rounded-full bg-[var(--accent-primary)] hover:opacity-90 text-[var(--bg-primary)] text-xs font-extrabold transition shadow-xs active:scale-95 flex items-center gap-1.5 disabled:opacity-60"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-secondary)]" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <span>Update now</span>
                  <span className="text-[var(--accent-secondary)]">✦</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
