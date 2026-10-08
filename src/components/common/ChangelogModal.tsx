import React from 'react';
import { Sparkles, X, GitCommit, CheckCircle2, Coffee, ExternalLink, Mail } from 'lucide-react';
import { CHANGELOG_VERSIONS } from '../../data/changelogData';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-[var(--modal-bg)] text-[var(--text-primary)] rounded-3xl shadow-2xl border border-[var(--border-subtle)] overflow-hidden text-left"
        onClick={e => e.stopPropagation()}
      >
        {/* Floating Top-Right Close Button */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30">
          <button
            onClick={onClose}
            aria-label="Close changelog"
            className="p-2 sm:p-2.5 rounded-full bg-[var(--chip-bg)] hover:opacity-85 text-[var(--text-primary)] transition active:scale-95 shadow-xs border border-[var(--border-subtle)] backdrop-blur-sm"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Unified Scrollable Container: Header + Releases + Footer all scroll together */}
        <div className="overflow-y-auto overflow-x-hidden no-scrollbar w-full h-full flex flex-col">
          {/* Scrollable Modal Header */}
          <div className="p-5 sm:p-7 pr-14 sm:pr-16 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--accent-primary)] mb-1">
              <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
              <span>Changelog & Version History</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
              EHSAAN PLAY Updates
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-snug">
              Comprehensive log of feature improvements, UI enhancements, and local-first updates.
            </p>
          </div>

          {/* Release Versions Flow */}
          <div className="p-4 sm:p-7 space-y-6 sm:space-y-8 flex-1 text-xs sm:text-sm">
            {/* Cute Academic Break Notice (Blood Red for all themes) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#7F1D1D] text-white border border-[#991B1B]/60 shadow-md space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-wider text-amber-300 hidden lg:flex items-center gap-1.5">
                    <span>Special Notice</span>
                    <span>·</span>
                    <span>Examinations Hiatus</span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-black leading-snug text-white mt-0.5">
                    THE DEVELOPMENT OF THIS APP IS STOPPED TILL DECEMBER 2026 DUE TO EXAMINATIONS
                  </h4>
                </div>
                <a
                  href="mailto:worsmon@proton.me?subject=EHSAAN%20PLAY%20-%20Bug%20Report%20/%20Feature%20Request"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[var(--accent-secondary)] text-[var(--accent-secondary-text)] text-xs font-black hover:opacity-90 active:scale-95 transition-all shrink-0 shadow-xs border border-white/10"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Contact</span>
                </a>
              </div>
              <p className="text-xs text-white/85 leading-relaxed">
                Any bug and feature request is welcome! Feel free to send your thoughts, suggestions, or issues directly using the contact button.
              </p>
            </div>

            {CHANGELOG_VERSIONS.map(ver => (
              <div key={ver.version} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full font-black text-xs ${
                        ver.isLatest
                          ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                          : 'bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] shadow-2xs border border-[var(--border-subtle)] font-extrabold'
                      }`}
                    >
                      {ver.version}
                    </span>
                    {ver.isLatest && (
                      <span className="text-xs font-extrabold text-[var(--accent-primary)] uppercase tracking-wider">
                        Latest Release
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className={`p-4 sm:p-5 rounded-2xl border space-y-3 shadow-2xs ${
                    ver.isLatest
                      ? 'bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] border-[var(--border-subtle)]'
                      : 'bg-[var(--bg-surface-card)] text-[var(--text-primary)] border-[var(--border-subtle)]'
                  }`}
                >
                  <div className="font-extrabold text-[var(--text-primary)] text-sm flex items-center gap-2">
                    <GitCommit className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                    <span>{ver.tagline}</span>
                  </div>

                  <ul className="space-y-2 leading-relaxed font-medium">
                    {ver.points.map((pt, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[var(--accent-primary)] flex-none mt-0.5" />
                        <span>
                          {pt.title && <strong className="font-bold">{pt.title}: </strong>}
                          <span>{pt.description}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Scrollable Modal Footer */}
          <div className="p-4 sm:p-5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0 mt-auto">
            <a
              href="https://ehsaan.odoo.com/support"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4.5 py-2.5 rounded-full bg-[var(--bg-card-yellow)] hover:opacity-90 text-[var(--text-card-yellow)] text-xs font-black transition shadow-2xs active:scale-95 border border-[var(--border-subtle)] group"
            >
              <Coffee className="w-4 h-4 text-[var(--text-card-yellow)] group-hover:rotate-12 transition-transform" />
              <span>Support EHSAAN PLAY</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>

            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold hover:opacity-90 transition active:scale-95 text-center"
            >
              Close Window
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
