import React from 'react';
import { ArrowLeftRight, Search, Layers, X, Check } from 'lucide-react';

interface SwapNavModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSwap: () => void;
  isCurrentlySwapped: boolean;
}

export const SwapNavModal: React.FC<SwapNavModalProps> = ({
  isOpen,
  onClose,
  onConfirmSwap,
  isCurrentlySwapped,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-[var(--modal-bg)] text-[var(--text-primary)] rounded-3xl p-5 sm:p-6 shadow-2xl border border-[var(--border-subtle)] space-y-4 animate-scale-up text-left"
      >
        {/* Header with Badge & Close */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-primary)] text-[var(--bg-primary)] flex items-center justify-center shadow-xs">
              <ArrowLeftRight className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                {isCurrentlySwapped ? 'Restore Default Layout?' : 'Exchange Navigation Positions?'}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Quick long-press layout customization
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--chip-bg)] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Visual Swap Explainer Container */}
        <div className="p-3.5 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] space-y-2.5 text-xs">
          <div className="flex items-center justify-between font-bold text-[var(--text-primary)]">
            <span className="flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>Search Bar</span>
            </span>
            <ArrowLeftRight className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>Custom Lists</span>
            </span>
          </div>

          <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] leading-relaxed">
            {isCurrentlySwapped
              ? 'This will return Search to the top header corner and restore Custom Lists to the bottom navigation bar.'
              : 'This will move Search to the mobile bottom navigation bar and place Custom Lists in the top header corner.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-2xl bg-[var(--chip-bg)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-xs font-bold transition active:scale-95 text-center"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmSwap();
              onClose();
            }}
            className="flex-1 py-2.5 px-4 rounded-2xl bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:opacity-90 text-xs font-bold transition active:scale-95 text-center shadow-xs flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{isCurrentlySwapped ? 'Restore' : 'Swap Layout'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
