import React, { useState } from 'react';
import { useRegisterBackAction } from '../../contexts/BackNavigationContext';
import {
  Scale,
  X,
  Check,
  AlertCircle,
  Info,
  ExternalLink,
  Copy,
  CheckCheck,
  FileText,
  ShieldCheck,
  Github,
  Code2,
  BookOpen,
} from 'lucide-react';

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'legal'>('summary');
  const [copiedLink, setCopiedLink] = useState(false);

  useRegisterBackAction(isOpen, onClose, 70);

  if (!isOpen) return null;

  const handleCopyRepo = () => {
    try {
      navigator.clipboard.writeText('https://github.com/ehsaanullah0/ehsaanplay');
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      // fallback
    }
  };

  const permissions = [
    { label: 'Commercial use', desc: 'Permitted for commercial deployments and production environments' },
    { label: 'Modification', desc: 'Source code may be modified, adapted, and extended' },
    { label: 'Distribution', desc: 'Copies and packages may be freely shared and distributed' },
    { label: 'Patent grant', desc: 'Contributors grant an explicit, royalty-free patent license' },
    { label: 'Private use', desc: 'May be run and modified privately without obligation to publish source' },
  ];

  const limitations = [
    { label: 'Liability', desc: 'Contributors and maintainers provide no legal liability' },
    { label: 'Warranty', desc: 'Software is provided as-is without warranty of any kind' },
  ];

  const conditions = [
    { label: 'License and copyright notice', desc: 'Original copyright notice and full license text must be retained' },
    { label: 'State changes', desc: 'Modified source files must carry prominent change notices' },
    { label: 'Disclose source', desc: 'Complete corresponding source code must be made accessible upon distribution' },
    { label: 'Same license', desc: 'Derivative works and modifications must be released under GNU GPL-3.0' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="license-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/60 backdrop-blur-md transition-colors duration-200 select-none animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-[var(--modal-bg)] text-[var(--text-primary)] rounded-[32px] sm:rounded-[36px] shadow-2xl border border-[var(--border-subtle)] overflow-hidden text-left animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Floating Top-Right Close Button */}
        <div className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 z-30">
          <button
            onClick={onClose}
            aria-label="Close license modal"
            className="p-2 sm:p-2.5 rounded-full bg-[var(--chip-bg)] hover:bg-[#7F1D1D] hover:text-white text-[var(--text-primary)] transition duration-200 active:scale-95 shadow-xs border border-[var(--border-subtle)] hover:border-[#991B1B]"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="overflow-y-auto overflow-x-hidden no-scrollbar w-full h-full flex flex-col">
          
          {/* Modal Header */}
          <div className="p-5 sm:p-7 pr-14 sm:pr-16 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0 relative overflow-hidden">
            {/* Subtle blood red ambient glow at top */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#991B1B] to-transparent opacity-80" />
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-[#7F1D1D] text-white flex items-center justify-center shadow-sm shadow-[#7F1D1D]/30 border border-[#991B1B]/40">
                <Scale className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-[var(--text-secondary)] tracking-wide block">
                  ehsaanullah0/ehsaanplay is licensed under the
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 id="license-modal-title" className="text-xl sm:text-2xl font-black tracking-tight text-[var(--text-primary)]">
                    GNU General Public License v3.0
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#7F1D1D]/15 dark:bg-[#7F1D1D]/25 text-[#991B1B] dark:text-[#F87171] text-[10px] font-extrabold uppercase tracking-wider border border-[#7F1D1D]/30 shadow-2xs">
                    Strong Copyleft
                  </span>
                </div>
              </div>
            </div>

            {/* Official copyleft paragraph from GitHub license card */}
            <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] font-medium leading-relaxed mt-2.5">
              Permissions of this strong copyleft license are conditioned on making available complete source code of licensed works and modifications, which include larger works using a licensed work, under the same license. Copyright and license notices must be preserved. Contributors provide an express grant of patent rights.
            </p>

            {/* View Switcher Tabs */}
            <div className="flex items-center gap-2 mt-4 pt-1">
              <button
                type="button"
                onClick={() => setActiveTab('summary')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                  activeTab === 'summary'
                    ? 'bg-[#7F1D1D] text-white shadow-xs border border-[#991B1B]'
                    : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>License Summary</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('legal')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                  activeTab === 'legal'
                    ? 'bg-[#7F1D1D] text-white shadow-xs border border-[#991B1B]'
                    : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Legal Preamble</span>
              </button>
            </div>
          </div>

          {/* TAB 1: Summary View */}
          {activeTab === 'summary' && (
            <div className="p-5 sm:p-7 space-y-6 flex-1">
              {/* Executive Summary Callout */}
              <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[var(--bg-surface-elevated)]/60 text-[var(--text-primary)] border-l-4 border-l-[#7F1D1D] border border-[var(--border-subtle)] shadow-xs flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-[#7F1D1D]/15 dark:bg-[#7F1D1D]/30 text-[#991B1B] dark:text-[#F87171] border border-[#7F1D1D]/30 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4 text-inherit" />
                </div>
                <div className="text-xs sm:text-[13px] leading-relaxed">
                  <div className="font-extrabold text-[var(--text-primary)] mb-1 text-sm tracking-tight flex items-center gap-2">
                    <span>Executive Summary</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7F1D1D]" />
                  </div>
                  <p className="text-[var(--text-secondary)]">
                    EHSAAN PLAY is open-source software licensed under the GNU General Public License v3.0 (GPL-3.0). You are granted freedom to run, examine, modify, and distribute this application. Under copyleft provisions, any modified versions or derivative works that are distributed must be released under the identical terms of GNU GPL v3.0, ensuring the full source code remains transparent and accessible to the entire community.
                  </p>
                </div>
              </div>

              {/* 3 Columns / Cards matching the GitHub license summary card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
                
                {/* 1. Permissions */}
                <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-[var(--border-subtle)]/60">
                    <span className="font-black text-sm text-[var(--text-primary)]">Permissions</span>
                    <span className="w-5 h-5 rounded-full bg-[var(--chip-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] flex items-center justify-center text-[10px] font-black">
                      5
                    </span>
                  </div>

                  <ul className="space-y-2.5">
                    {permissions.map(p => (
                      <li key={p.label} className="space-y-0.5">
                        <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-primary)]">
                          <Check className="w-3.5 h-3.5 text-[#16a34a] stroke-[3] shrink-0" />
                          <span>{p.label}</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] pl-5 leading-tight">
                          {p.desc}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 2. Limitations */}
                <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-[var(--border-subtle)]/60">
                    <span className="font-black text-sm text-[var(--text-primary)]">Limitations</span>
                    <span className="w-5 h-5 rounded-full bg-[#7F1D1D]/15 dark:bg-[#7F1D1D]/30 text-[#991B1B] dark:text-[#F87171] border border-[#7F1D1D]/30 flex items-center justify-center text-[10px] font-black">
                      2
                    </span>
                  </div>

                  <ul className="space-y-2.5">
                    {limitations.map(l => (
                      <li key={l.label} className="space-y-0.5">
                        <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-primary)]">
                          <X className="w-3.5 h-3.5 text-[#991B1B] dark:text-[#F87171] stroke-[3] shrink-0" />
                          <span>{l.label}</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] pl-5 leading-tight">
                          {l.desc}
                        </p>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]/40 text-[10px] text-[var(--text-secondary)] leading-relaxed italic">
                    The software is provided without charge, on an as-is basis without warranty of any kind.
                  </div>
                </div>

                {/* 3. Conditions */}
                <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-[var(--border-subtle)]/60">
                    <span className="font-black text-sm text-[var(--text-primary)]">Conditions</span>
                    <span className="w-5 h-5 rounded-full bg-[#7F1D1D]/15 dark:bg-[#7F1D1D]/30 text-[#991B1B] dark:text-[#F87171] border border-[#7F1D1D]/30 flex items-center justify-center text-[10px] font-black">
                      4
                    </span>
                  </div>

                  <ul className="space-y-2.5">
                    {conditions.map(c => (
                      <li key={c.label} className="space-y-0.5">
                        <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-primary)]">
                          <Info className="w-3.5 h-3.5 text-[#991B1B] dark:text-[#F87171] stroke-[2.5] shrink-0" />
                          <span>{c.label}</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] pl-5 leading-tight">
                          {c.desc}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              {/* Developer & Repository Attribution Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface-elevated)]/60 border border-[var(--border-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#7F1D1D]/15 dark:bg-[#7F1D1D]/30 text-[#991B1B] dark:text-[#F87171] border border-[#7F1D1D]/30 flex items-center justify-center font-black shrink-0">
                    <Code2 className="w-4 h-4 text-inherit" />
                  </div>
                  <div>
                    <div className="font-bold text-[var(--text-primary)]">
                      Created by EHSAAN ULLAH
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)]">
                      Repository: ehsaanullah0/ehsaanplay · Git Branch: main
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto">
                  <button
                    type="button"
                    onClick={handleCopyRepo}
                    className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-[var(--chip-bg)] hover:bg-[#7F1D1D]/15 hover:text-[#991B1B] dark:hover:text-[#F87171] active:scale-95 text-[var(--text-primary)] font-bold text-xs transition border border-[var(--border-subtle)] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <CheckCheck className="w-3.5 h-3.5 text-[#16a34a]" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Repo</span>
                      </>
                    )}
                  </button>

                  <a
                    href="https://github.com/ehsaanullah0/ehsaanplay/blob/main/LICENSE"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl bg-[#7F1D1D] hover:bg-[#991B1B] text-white active:scale-95 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs border border-[#991B1B]"
                  >
                    <Github className="w-3.5 h-3.5" />
                    <span>GitHub License</span>
                    <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Legal Preamble & GNU Terms */}
          {activeTab === 'legal' && (
            <div className="p-5 sm:p-7 space-y-4 flex-1 text-xs text-[var(--text-secondary)] leading-relaxed font-mono">
              <div className="p-4 rounded-2xl bg-[var(--bg-surface-card)] border-l-4 border-l-[#7F1D1D] border border-[var(--border-subtle)] space-y-3 font-sans text-xs">
                <div className="font-black text-sm text-[var(--text-primary)] flex items-center justify-between">
                  <span>GNU GENERAL PUBLIC LICENSE — Version 3, 29 June 2007</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#7F1D1D]/15 text-[#991B1B] dark:text-[#F87171] text-[10px] font-bold">Official Text</span>
                </div>
                <p>
                  Copyright © 2007 Free Software Foundation, Inc. (&lt;https://fsf.org/&gt;)
                  Everyone is permitted to copy and distribute verbatim copies of this license document, but changing it is not allowed.
                </p>
                <div className="p-3.5 rounded-xl bg-[var(--chip-bg)] border border-[#7F1D1D]/20 text-[11px] space-y-1.5 not-italic">
                  <div className="font-bold text-[#7F1D1D] dark:text-[#F87171] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7F1D1D]" />
                    Preamble Highlights:
                  </div>
                  <p>
                    The GNU General Public License is a free, copyleft license for software and other kinds of works. The licenses for most software and other practical works are designed to take away your freedom to share and change the works. By contrast, the GNU General Public License is intended to guarantee your freedom to share and change all versions of a program—to make sure it remains free software for all its users.
                  </p>
                  <p>
                    When we speak of free software, we are referring to freedom, not price. Our General Public Licenses are designed to make sure that you have the freedom to distribute copies of free software (and charge for them if you wish), that you receive source code or can get it if you want it, that you can change the software or use pieces of it in new free programs, and that you know you can do these things.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <a
                  href="https://www.gnu.org/licenses/gpl-3.0.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7F1D1D] hover:bg-[#991B1B] text-white font-bold text-xs transition active:scale-95 shadow-xs border border-[#991B1B]"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Read Complete Legal Text at GNU.org</span>
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>

                <button
                  type="button"
                  onClick={() => setActiveTab('summary')}
                  className="px-3.5 py-2 rounded-xl bg-[var(--chip-bg)] hover:bg-[#7F1D1D]/15 hover:text-[#991B1B] text-[var(--text-primary)] font-bold text-xs transition border border-[var(--border-subtle)]"
                >
                  Back to Summary View
                </button>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="p-4 sm:p-5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
              <span className="w-2 h-2 rounded-full bg-[#7F1D1D]" />
              <span>Free Software Foundation (FSF) · Copyleft Protection</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-full bg-[#7F1D1D] hover:bg-[#991B1B] text-white font-bold text-xs active:scale-95 transition shadow-xs border border-[#991B1B] cursor-pointer"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
