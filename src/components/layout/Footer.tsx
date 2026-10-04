import React, { useState } from 'react';
import { Sparkles, Github, ExternalLink, Coffee, History, Code2 } from 'lucide-react';
import { ChangelogModal } from '../common/ChangelogModal';

export const Footer: React.FC = () => {
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);

  return (
    <>
      <footer className="w-full mt-10 sm:mt-14 mb-0">
        <div className="bg-[var(--bg-surface-card)] p-5 sm:p-7 rounded-3xl border border-[var(--border-subtle)] text-[var(--text-primary)] shadow-2xs transition-all">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left Brand & Open Source Statement */}
            <div className="space-y-2 max-w-xl text-left">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#4E562F] text-[#FAF8F2] flex items-center justify-center font-black text-xs shadow-xs">
                  EP
                </div>
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-[var(--text-primary)]">
                  EHSAAN PLAY
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#E4EAB8] text-[#3B421E] text-[11px] font-bold inline-flex items-center gap-1 shadow-2xs">
                  <Code2 className="w-3 h-3" />
                  <span>Open Source</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                A personal cinema journal designed with extreme minimalism, local-first privacy, calm typography, and zero commercial noise.
              </p>
            </div>

            {/* Right Action Pills (Support, GitHub, Changelog) */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              {/* 1. Support Button with Coffee Cup Logo */}
              <a
                href="https://ehsaan.odoo.com/support"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#4E562F] hover:bg-[#3E4524] text-[#FAF8F2] text-xs font-bold transition shadow-xs active:scale-95 group"
                title="Support EHSAAN PLAY on Odoo"
              >
                <Coffee className="w-4 h-4 text-[#E4EAB8] group-hover:rotate-12 transition-transform" />
                <span>Support Project</span>
                <ExternalLink className="w-3 h-3 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>

              {/* 2. GitHub Showcase Link */}
              <a
                href="https://github.com/ehsaanullah/ehsaanplay"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#E4EAB8] hover:bg-[#D8E0A3] text-[#3B421E] text-xs font-bold transition shadow-xs active:scale-95 group border border-[#4E562F]/20"
                title="View GitHub Repository"
              >
                <Github className="w-4 h-4 text-[#3B421E] group-hover:scale-110 transition-transform" />
                <span>GitHub</span>
                <ExternalLink className="w-3 h-3 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>

              {/* 3. Changelog Trigger Button */}
              <button
                onClick={() => setIsChangelogOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--chip-bg)] hover:bg-[var(--accent-primary)] hover:text-[var(--bg-primary)] text-[var(--text-primary)] text-xs font-bold transition border border-[var(--border-subtle)] active:scale-95 group shadow-2xs"
                title="View Full Version Changelog"
              >
                <History className="w-4 h-4 text-[var(--accent-primary)] group-hover:text-inherit transition-colors" />
                <span>Changelog v2.4.0</span>
              </button>
            </div>
          </div>

          {/* Bottom Divider & Meta Tagline */}
          <div className="mt-6 pt-5 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-2.5 font-medium">
              <span>Version 2.4.0</span>
              <span aria-hidden="true">·</span>
              <span>Local-First PWA</span>
              <span aria-hidden="true">·</span>
              <span>MIT License</span>
            </div>

            <div className="text-[11px] opacity-80">
              Crafted for cinephiles · Fully Offline Capable · No Ads
            </div>
          </div>
        </div>
      </footer>

      {/* Changelog Modal Window */}
      <ChangelogModal
        isOpen={isChangelogOpen}
        onClose={() => setIsChangelogOpen(false)}
      />
    </>
  );
};
