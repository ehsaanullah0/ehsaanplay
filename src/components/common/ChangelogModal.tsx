import React from 'react';
import { Sparkles, X, GitCommit, CheckCircle2, Heart, Coffee, ExternalLink, Github } from 'lucide-react';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-[#FAF8F2] text-[#282C1B] rounded-3xl shadow-2xl border border-[#4E562F]/20 overflow-hidden text-left"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 sm:p-7 border-b border-[#4E562F]/15 bg-[#F6F4E5] flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#4E562F] mb-1">
              <Sparkles className="w-4 h-4 text-[#4E562F]" />
              <span>Changelog & Version History</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-[#282C1B]">
              EHSAAN PLAY Updates
            </h2>
            <p className="text-xs text-[#6A7056] mt-1 leading-snug">
              Comprehensive log of feature improvements, UI enhancements, and local-first updates.
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close changelog"
            className="p-2 rounded-full bg-[#EAE5D8] hover:bg-[#E0DAA8] text-[#282C1B] transition active:scale-95"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Scrollable Changelog List */}
        <div className="p-6 sm:p-7 overflow-y-auto space-y-8 no-scrollbar text-xs sm:text-sm">
          {/* Version 2.4.0 (Latest Release - Light Olive Card) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#4E562F] text-[#FAF8F2] font-black text-xs">
                  v2.4.0
                </span>
                <span className="text-xs font-extrabold text-[#4E562F] uppercase tracking-wider">Latest Release</span>
              </div>
              <span className="text-xs text-[#8C9272] font-mono">2026-10-04</span>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#E4EAB8] text-[#3B421E] border border-[#4E562F]/25 space-y-3 shadow-2xs">
              <div className="font-extrabold text-[#282C1B] text-sm flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-[#3B421E]" />
                <span>Scroll Topbar & Journal Backup Refinement</span>
              </div>

              <ul className="space-y-2 text-[#3B421E] leading-relaxed font-medium">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#3B421E] flex-none mt-0.5" />
                  <span>
                    <strong>Auto-Hiding Scroll Topbar</strong>: Header topbar now smoothly hides on scroll down to maximize viewport space and slides back into view when scrolling up across all screens.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#3B421E] flex-none mt-0.5" />
                  <span>
                    <strong>Renamed Backup Journal File</strong>: Renamed export JSON file to <code className="font-mono bg-black/10 px-1 rounded">ehsaan-play-journal-backup-[date].json</code> matching EHSAAN PLAY brand identity.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Version 2.3.0 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-[#E4EAB8] text-[#3B421E] font-extrabold text-xs shadow-2xs border border-[#4E562F]/15">
                v2.3.0
              </span>
              <span className="text-xs text-[#8C9272] font-mono">2026-10-04</span>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#F6F4E5] border border-[#4E562F]/10 space-y-3">
              <div className="font-extrabold text-[#282C1B] text-sm flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-[#3B421E]" />
                <span>PWA Update System, Footer & UI Polish</span>
              </div>

              <ul className="space-y-2 text-[#3B421E] leading-relaxed font-medium">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#3B421E] flex-none mt-0.5" />
                  <span>
                    <strong>Built-In PWA Update System</strong>: Integrated Service Worker version detection and instant update trigger directly in Settings with safe background cache revalidation.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#3B421E] flex-none mt-0.5" />
                  <span>
                    <strong>Minimal Footer Showcase</strong>: Added a clean, minimal footer displaying open-source statement, GitHub showcase, and quick support links.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#3B421E] flex-none mt-0.5" />
                  <span>
                    <strong>Two Grid View in Settings</strong>: Refactored Settings cards into a 2-column masonry waterfall layout with an icon-only view toggle (<code className="font-mono bg-black/10 px-1 rounded">Rows</code> vs <code className="font-mono bg-black/10 px-1 rounded">Grid</code>).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#3B421E] flex-none mt-0.5" />
                  <span>
                    <strong>Added & Improved Explore Section</strong>: Enhanced dynamic TMDB discovery recommendations on the Home page with zero-network fallback safety.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#3B421E] flex-none mt-0.5" />
                  <span>
                    <strong>New Warm Yellow UI Accents</strong>: Introduced rich warm yellow accents (<code className="font-mono bg-black/10 px-1 rounded">#FEDB99</code>) across Continue Watching cards, active favorite highlights, and support buttons.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Version 2.2.0 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-[#E4EAB8] text-[#3B421E] font-extrabold text-xs shadow-2xs border border-[#4E562F]/15">
                v2.2.0
              </span>
              <span className="text-xs text-[#8C9272] font-mono">2026-10-04</span>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#F6F4E5] border border-[#4E562F]/10 space-y-3">
              <div className="font-extrabold text-[#282C1B] text-sm flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-[#4E562F]" />
                <span>Major UI Polish & Feature Suite</span>
              </div>

              <ul className="space-y-2 text-[#494E38] leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4E562F] flex-none mt-0.5" />
                  <span>
                    <strong>Tomato FOSS Aesthetic Splash Screen</strong>: Designed a warm, minimal app loading page with line-art clapperboard logo and pulsing status pill.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4E562F] flex-none mt-0.5" />
                  <span>
                    <strong>Masonry Waterfall Settings Layout</strong>: Transformed Settings grid into a responsive multi-column waterfall layout that eliminates empty vertical gaps.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4E562F] flex-none mt-0.5" />
                  <span>
                    <strong>Light Olive Color Theme Accents</strong>: Re-styled the Main Library Count Card (<code className="font-mono bg-black/5 px-1 rounded">Your Cinema Shelf</code>) and Random Pick button to light olive (<code className="font-mono bg-black/5 px-1 rounded">#E4EAB8</code>).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4E562F] flex-none mt-0.5" />
                  <span>
                    <strong>Horizontal Album Continue Watching</strong>: Redesigned Continue Watching cards into horizontal movie album cards with borderless yellow containers (<code className="font-mono bg-black/5 px-1 rounded">#FEDB99</code>) and dark yellow progress bars.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4E562F] flex-none mt-0.5" />
                  <span>
                    <strong>Mobile Preview Customizer & Artwork</strong>: Enabled background artwork visibility on mobile devices and centered customizer popover for small screens.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4E562F] flex-none mt-0.5" />
                  <span>
                    <strong>Yellow Favorite Active State</strong>: Favorited titles now highlight with a rich warm yellow badge (<code className="font-mono bg-black/5 px-1 rounded">#FEDB99</code> / <code className="font-mono bg-black/5 px-1 rounded">#624B15</code>).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4E562F] flex-none mt-0.5" />
                  <span>
                    <strong>Bidirectional TV Episode Syncing</strong>: Marking series watched or moving progress slider automatically completes season and episode checkboxes.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4E562F] flex-none mt-0.5" />
                  <span>
                    <strong>Merged Overview & Production Details</strong>: Display full synopsis paragraph without line-clamp truncation alongside merged production metadata.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4E562F] flex-none mt-0.5" />
                  <span>
                    <strong>Custom Keyboard Shortcuts</strong>: Configurable keybindings for Back, Home, Watchlist, Search, and Custom Lists in Settings.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4E562F] flex-none mt-0.5" />
                  <span>
                    <strong>Enhanced Offline Artwork Loading</strong>: Multi-size fallback lookup across caches ensures pre-cached artwork loads 100% reliably offline.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4E562F] flex-none mt-0.5" />
                  <span>
                    <strong>Support & Coffee Integration</strong>: Direct Support link (<code className="font-mono bg-black/5 px-1 rounded">ehsaan.odoo.com/support</code>) added to footer and settings.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Version 2.1.0 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-[#E4EAB8] text-[#3B421E] font-extrabold text-xs shadow-2xs border border-[#4E562F]/15">
                v2.1.0
              </span>
              <span className="text-xs text-[#8C9272] font-mono">2026-10-04</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#F6F4E5] border border-[#4E562F]/10 space-y-2">
              <ul className="space-y-1.5 text-[#494E38]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#4E562F] flex-none mt-0.5" />
                  <span>Added Open Source GitHub Showcase badge (<code className="font-mono bg-black/5 px-1 rounded">github.com/ehsaanullah/ehsaanplay</code>).</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#4E562F] flex-none mt-0.5" />
                  <span>Cleaned up header search bar by removing shortcut badge icon.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Version 2.0.0 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-[#E4EAB8] text-[#3B421E] font-extrabold text-xs shadow-2xs border border-[#4E562F]/15">
                v2.0.0
              </span>
              <span className="text-xs text-[#8C9272] font-mono">Initial Public Release</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#F6F4E5] border border-[#4E562F]/10 space-y-2">
              <ul className="space-y-1.5 text-[#494E38]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#4E562F] flex-none mt-0.5" />
                  <span>Local-First PWA architecture with IndexedDB & Cache Storage.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#4E562F] flex-none mt-0.5" />
                  <span>Live TMDB catalog search, recommendations, and custom lists.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#4E562F]/15 bg-[#F6F4E5] flex items-center justify-between gap-3 text-xs">
          <a
            href="https://ehsaan.odoo.com/support"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-[#FEDB99] hover:bg-[#F2C97F] text-[#624B15] text-xs font-black transition shadow-2xs active:scale-95 border border-[#624B15]/20 group"
          >
            <Coffee className="w-4 h-4 text-[#624B15] group-hover:rotate-12 transition-transform" />
            <span>Support EHSAAN PLAY</span>
            <ExternalLink className="w-3 h-3 opacity-80" />
          </a>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#4E562F] text-[#FAF8F2] font-bold hover:bg-[#3E4524] transition active:scale-95"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
