import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { UserSettings } from '../../types/movie';
import { ImportResult } from '../../services/storage';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useFullscreen, requestAppFullscreen, exitAppFullscreen } from '../../hooks/useFullscreen';
import {
  ArrowRight,
  Check,
  Upload,
  Compass,
  Sun,
  Moon,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  Film,
  Sparkles,
  Github,
  HardDrive,
  Download,
  Smartphone,
  Zap,
  Maximize2,
  Minimize2,
  Share2,
  Code2,
} from 'lucide-react';

interface StartGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  onRestoreBackup: (json: string) => ImportResult | boolean;
  onOpenLicense?: () => void;
}

export const StartGuideModal: React.FC<StartGuideModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onRestoreBackup,
  onOpenLicense,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [customKeyInput, setCustomKeyInput] = useState<string>(settings.omdbApiKey || '');
  const [isKeySaved, setIsKeySaved] = useState<boolean>(false);
  const [restoreStatus, setRestoreStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const { isInstalled, isIOS, install } = usePWAInstall();
  const { isFullscreen } = useFullscreen();
  const [installSuccess, setInstallSuccess] = useState(false);

  const totalSteps = 7; // 0: Fullscreen, 1: Welcome, 2: OMDb, 3: Colors, 4: Privacy, 5: Restore, 6: Install PWA

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setRestoreStatus(null);
    }
  }, [isOpen]);

  const handleComplete = useCallback(() => {
    try {
      localStorage.setItem('ehsaan_start_guide_completed_v1', 'true');
    } catch {
      // ignore
    }
    onClose();
  }, [onClose]);

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, totalSteps, handleComplete]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Keyboard navigation for desktop users
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleComplete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, handleComplete]);

  if (!isOpen) return null;

  const handleSaveOmdbKey = () => {
    const trimmed = customKeyInput.trim();
    onUpdateSettings({ omdbApiKey: trimmed });
    setIsKeySaved(true);
    setTimeout(() => setIsKeySaved(false), 2500);
  };

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
    }
  };

  const handleBackupUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const text = event.target?.result as string;
        const result = onRestoreBackup(text);
        if (typeof result === 'object' && result.success) {
          setRestoreStatus({
            success: true,
            message: result.message || 'Backup successfully restored!',
          });
          setTimeout(() => {
            handleComplete();
          }, 1400);
        } else {
          setRestoreStatus({
            success: false,
            message: 'Invalid backup file. Please verify JSON format.',
          });
        }
      } catch {
        setRestoreStatus({
          success: false,
          message: 'Failed to read backup file.',
        });
      }
    };
    reader.readAsText(file);
  };

  const colorSchemes = [
    { id: 'orange', label: 'Warm Peach (Default)', color: '#7C4022', bg: '#FFCCA7' },
    { id: 'olive', label: 'Olive Green', color: '#4E562F', bg: '#E4EAB8' },
    { id: 'blue', label: 'Sky Blue', color: '#2B447A', bg: '#B6CFFC' },
    { id: 'pink', label: 'Rose Blush', color: '#7A2E44', bg: '#F8B4C8' },
    { id: 'purple', label: 'Lavender', color: '#4A2E7A', bg: '#D0B4F8' },
    { id: 'mint', label: 'Fresh Sage', color: '#2E664F', bg: '#B4F8D8' },
  ];

  const stepLabels = [
    'Fullscreen',
    'Welcome',
    'OMDb Data',
    'Calm Colors',
    'Local Privacy',
    'Restore',
    'Install App',
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="start-guide-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 lg:p-8 bg-black/65 backdrop-blur-md transition-colors duration-200 select-none overflow-y-auto"
    >
      {/* 
        Responsive Card Container:
        - Mobile: Exactly 100dvh (dynamic viewport height)
        - Desktop: Elegantly centered landscape card with max-height constraint so it never overflows browser window
      */}
      <div className="w-full h-[100dvh] sm:h-auto sm:max-h-[min(720px,calc(100vh-32px))] sm:min-h-[560px] md:max-w-4xl lg:max-w-5xl flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] sm:rounded-[36px] lg:rounded-[44px] sm:border sm:border-[var(--border-subtle)] shadow-2xl overflow-hidden transition-all duration-300 my-auto">
        
        {/* Top Header Bar */}
        <header className="w-full px-4 sm:px-6 md:px-8 py-3.5 sm:py-4 border-b border-[var(--border-subtle)]/40 flex items-center justify-between shrink-0 bg-[var(--bg-primary)]">
          {/* Back Button or Brand Indicator */}
          <div className="flex items-center gap-2.5">
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition py-1.5 px-3 rounded-full hover:bg-[var(--chip-bg)] active:scale-95 border border-[var(--border-subtle)]/40"
              >
                <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden sm:inline">Back</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-primary)] animate-pulse" />
                <span className="text-[11px] sm:text-xs font-black tracking-widest uppercase text-[var(--text-secondary)]">
                  Start Guide
                </span>
              </div>
            )}
          </div>

          {/* Center: Desktop Step Indicators (Adaptive to avoid crowding) */}
          <div className="hidden md:flex items-center gap-1 bg-[var(--chip-bg)]/60 p-1 rounded-full border border-[var(--border-subtle)]/40">
            {stepLabels.map((label, idx) => {
              const isActive = currentStep === idx;
              const isPast = currentStep > idx;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setCurrentStep(idx)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs scale-102'
                      : isPast
                      ? 'text-[var(--text-primary)] hover:bg-[var(--chip-bg)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  title={`Step ${idx + 1}: ${label}`}
                >
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black bg-current/15">
                    {isPast ? '✓' : idx + 1}
                  </span>
                  <span className={isActive ? 'inline' : 'hidden lg:inline'}>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile Step Counter */}
          <div className="md:hidden text-xs font-extrabold text-[var(--text-secondary)]">
            Step {currentStep + 1} / {totalSteps}
          </div>

          {/* Right: Skip Guide Button */}
          <button
            type="button"
            onClick={handleComplete}
            className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition py-1.5 px-3.5 rounded-full hover:bg-[var(--chip-bg)] active:scale-95 border border-transparent hover:border-[var(--border-subtle)]"
          >
            Skip
          </button>
        </header>

        {/* 
          Responsive Body:
          - Mobile: Single column flex layout perfectly distributed inside viewport
          - Desktop: 2-column landscape split with balanced art & content columns
        */}
        <div className="flex-1 w-full min-h-0 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          
          {/* ========================================================= */}
          {/* LEFT COLUMN (Desktop Art Showcase Studio)                 */}
          {/* ========================================================= */}
          <div className="md:col-span-5 hidden md:flex flex-col justify-between items-center p-6 lg:p-8 bg-[var(--bg-surface-elevated)]/35 border-r border-[var(--border-subtle)]/40 relative overflow-hidden select-none">
            <div className="absolute inset-0 bg-radial from-[var(--accent-secondary)]/25 to-transparent pointer-events-none opacity-60" />

            {/* Top Step Badge on Desktop */}
            <div className="relative z-10 px-3.5 py-1 rounded-full bg-[var(--bg-surface-card)]/80 border border-[var(--border-subtle)] text-[11px] font-extrabold uppercase tracking-wider text-[var(--accent-primary)] shadow-2xs">
              {currentStep === 0 && 'Theater View'}
              {currentStep === 1 && 'The Welcome Note'}
              {currentStep === 2 && 'Metadata Engine'}
              {currentStep === 3 && 'Calm Palettes'}
              {currentStep === 4 && 'Independence'}
              {currentStep === 5 && 'Library Migration'}
              {currentStep === 6 && 'Standalone PWA'}
            </div>

            {/* Center Sticker Artwork with standard responsive bounds */}
            <div className="relative z-10 w-full flex items-center justify-center my-auto py-2">
              {currentStep === 0 && (
                <div className="w-60 h-56 lg:w-72 lg:h-64 flex items-center justify-center animate-fade-in">
                  <StickerFullscreen />
                </div>
              )}
              {currentStep === 1 && (
                <div className="w-64 h-52 lg:w-72 lg:h-60 flex items-center justify-center animate-fade-in">
                  <StickerWelcome />
                </div>
              )}
              {currentStep === 2 && (
                <div className="w-60 h-48 lg:w-68 lg:h-56 flex items-center justify-center animate-fade-in">
                  <StickerOMDb />
                </div>
              )}
              {currentStep === 3 && (
                <div className="w-60 h-48 lg:w-68 lg:h-56 flex items-center justify-center animate-fade-in">
                  <StickerThemes />
                </div>
              )}
              {currentStep === 4 && (
                <div className="w-60 h-48 lg:w-68 lg:h-56 flex items-center justify-center animate-fade-in">
                  <StickerOpenSource />
                </div>
              )}
              {currentStep === 5 && (
                <div className="w-60 h-48 lg:w-68 lg:h-56 flex items-center justify-center animate-fade-in">
                  <StickerAllSet />
                </div>
              )}
              {currentStep === 6 && (
                <div className="w-60 h-48 lg:w-68 lg:h-56 flex items-center justify-center animate-fade-in">
                  <StickerPWA />
                </div>
              )}
            </div>

            {/* Bottom Philosophy Caption on Desktop */}
            <div className="relative z-10 w-full max-w-xs px-3.5 py-2 rounded-2xl bg-[var(--bg-surface-card)]/85 border border-[var(--border-subtle)] text-center text-[11px] font-semibold text-[var(--text-secondary)] shadow-2xs">
              {currentStep === 0 && 'Go edge-to-edge or toggle anytime from the top bar expand button.'}
              {currentStep === 1 && 'Start fresh with zero sample clutter. Add only movies you love.'}
              {currentStep === 2 && 'Connected with OMDb API for rich posters and metadata.'}
              {currentStep === 3 && 'Material 3 colors tailored for daylight and midnight cinema.'}
              {currentStep === 4 && '100% private on your device with zero cloud telemetry.'}
              {currentStep === 5 && 'Have an exported backup? Restore your collection in seconds.'}
              {currentStep === 6 && 'Install for fullscreen native immersion without browser tabs.'}
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN (Content + Mobile Sticker + Bottom Controls) */}
          {/* ========================================================= */}
          <div className="md:col-span-7 h-full flex flex-col justify-between overflow-hidden bg-[var(--bg-primary)]">
            
            {/* Scrollable Content Area: Scrolls smoothly from top, no clipping */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 sm:px-8 lg:px-10 flex flex-col justify-start">
              <div className="w-full max-w-lg mx-auto md:mx-0 my-auto flex flex-col items-center md:items-start text-center md:text-left space-y-3.5 sm:space-y-4 py-2">
                
                {/* Step 0: Fullscreen Launch Page */}
                {currentStep === 0 && (
                  <div className="w-full flex flex-col items-center md:items-start space-y-3 sm:space-y-4 animate-fade-in">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--chip-bg)] text-[var(--chip-text)] text-[11px] font-bold tracking-wide">
                        <Maximize2 className="w-3 h-3 text-[var(--accent-primary)]" />
                        <span>Immersive Theater • Step 1</span>
                      </div>
                      <h1 id="start-guide-title" className="text-3xl sm:text-4xl md:text-5xl font-black text-[var(--text-primary)] tracking-tight leading-[1.06]">
                        Cinema in <br className="hidden md:inline" />
                        <span className="text-[var(--accent-primary)]">full view.</span>
                      </h1>
                    </div>

                    {/* Mobile Sticker Showcase */}
                    <div className="md:hidden w-48 h-44 sm:w-56 sm:h-48 my-0.5 flex items-center justify-center">
                      <StickerFullscreen />
                    </div>

                    <p className="text-xs sm:text-sm md:text-base text-[var(--text-secondary)] font-medium leading-relaxed max-w-sm md:max-w-lg">
                      Switch to fullscreen mode for an edge-to-edge theater view, smoother gesture navigation, and zero distracting browser bars.
                    </p>

                    {/* Top Bar Fullscreen Button Callout & Direct Toggle */}
                    <div className="w-full max-w-sm md:max-w-lg bg-[var(--bg-surface-card)] p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-[var(--border-subtle)] space-y-3 text-left shadow-2xs">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-[var(--chip-bg)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 mt-0.5">
                          <Maximize2 className="w-4 h-4 text-[var(--accent-primary)] stroke-[2.5]" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-[var(--text-primary)]">
                            Top Bar Fullscreen Button
                          </div>
                          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mt-0.5">
                            You can enter or exit fullscreen anytime using the quick expand icon button in the top navigation bar.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          try {
                            if (isFullscreen) {
                              exitAppFullscreen();
                            } else {
                              requestAppFullscreen();
                            }
                          } catch {
                            // ignore fullscreen restrictions in embedded frames
                          }
                        }}
                        className={`w-full py-2.5 px-4 rounded-full font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer shadow-2xs ${
                          isFullscreen
                            ? 'bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] border border-[var(--border-subtle)]'
                            : 'bg-[var(--accent-secondary)] text-[var(--accent-secondary-text)] hover:opacity-90 border border-[var(--border-subtle)]'
                        }`}
                      >
                        {isFullscreen ? (
                          <>
                            <Minimize2 className="w-4 h-4 stroke-[2.5]" />
                            <span>Fullscreen Active — Tap to Exit</span>
                          </>
                        ) : (
                          <>
                            <Maximize2 className="w-4 h-4 stroke-[2.5]" />
                            <span>Go Fullscreen Now</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 1: Welcome Note */}
                {currentStep === 1 && (
                  <div className="w-full flex flex-col items-center md:items-start space-y-3 sm:space-y-3.5 animate-fade-in">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--chip-bg)] text-[var(--chip-text)] text-[11px] font-bold tracking-wide">
                        <Sparkles className="w-3 h-3 text-[var(--accent-primary)]" />
                        <span>β Beta • Start Guide</span>
                      </div>
                      <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[var(--text-primary)] tracking-tight leading-[1.08]">
                        Welcome to <br className="hidden md:inline" />
                        <span className="text-[var(--accent-primary)]">EHSAAN PLAY</span>
                      </h2>
                    </div>

                    {/* Mobile Sticker Showcase */}
                    <div className="md:hidden w-52 h-40 sm:w-60 sm:h-48 my-1 flex items-center justify-center">
                      <StickerWelcome />
                    </div>

                    <p className="text-xs sm:text-sm md:text-base text-[var(--text-secondary)] font-medium leading-relaxed max-w-sm md:max-w-lg">
                      Let's get everything set up for you. Your personal cinematic sanctuary to track progress, curate lists, and explore timeless cinema without distractions.
                    </p>

                    {/* Desktop Feature Highlights */}
                    <div className="hidden md:grid grid-cols-2 gap-3 w-full pt-1">
                      <div className="p-3 rounded-2xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] space-y-1">
                        <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-primary)]">
                          <Film className="w-4 h-4 text-[var(--accent-primary)]" />
                          <span>Clean Slate Start</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          Zero auto-seeded dummy entries. Watchlist starts completely clean.
                        </p>
                      </div>
                      <div className="p-3 rounded-2xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] space-y-1">
                        <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-primary)]">
                          <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
                          <span>Material Aesthetics</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          Calm Material 3 colors, theme sync, and smooth typography.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: OMDb Cinema Data */}
                {currentStep === 2 && (
                  <div className="w-full flex flex-col items-center md:items-start space-y-3 sm:space-y-3.5 animate-fade-in">
                    <div className="space-y-0.5">
                      <div className="text-xs font-extrabold uppercase tracking-widest text-[var(--accent-primary)]">
                        Metadata Engine
                      </div>
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--text-primary)] tracking-tight">
                        OMDb Cinema Data
                      </h2>
                    </div>

                    {/* Mobile Sticker */}
                    <div className="md:hidden w-48 h-36 sm:w-56 sm:h-44 my-1 flex items-center justify-center">
                      <StickerOMDb />
                    </div>

                    <p className="text-xs sm:text-sm md:text-base text-[var(--text-secondary)] font-medium leading-relaxed max-w-sm md:max-w-lg">
                      EHSAAN PLAY links seamlessly with OMDb API Database to fetch real-time posters, trailers, synopses, ratings, and cast members.
                    </p>

                    {/* OMDb Status & Custom Key Card */}
                    <div className="w-full max-w-sm md:max-w-lg bg-[var(--bg-surface-card)] p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-[var(--border-subtle)] space-y-2 text-left shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                          <Key className="w-4 h-4 text-[var(--accent-primary)]" />
                          <span>Global Discovery Status</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-[var(--chip-bg)] text-[var(--accent-primary)] text-[10px] font-bold uppercase tracking-wider border border-[var(--border-subtle)]">
                          ✓ Connected & Ready
                        </span>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Optional custom OMDb key"
                          value={customKeyInput}
                          onChange={e => setCustomKeyInput(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                        />
                        <button
                          type="button"
                          onClick={handleSaveOmdbKey}
                          className="px-3.5 py-1.5 rounded-xl bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-90 active:scale-95 transition shadow-xs shrink-0"
                        >
                          {isKeySaved ? 'Saved!' : 'Save'}
                        </button>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        Free public discovery is active right out of the box — no custom key required.
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 3: Calm Colors & Dark Mode */}
                {currentStep === 3 && (
                  <div className="w-full flex flex-col items-center md:items-start space-y-3 sm:space-y-3.5 animate-fade-in">
                    <div className="space-y-0.5">
                      <div className="text-xs font-extrabold uppercase tracking-widest text-[var(--accent-primary)]">
                        Design Constitution
                      </div>
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--text-primary)] tracking-tight">
                        Calm Colors & Dark Mode
                      </h2>
                    </div>

                    {/* Mobile Sticker */}
                    <div className="md:hidden w-48 h-36 sm:w-56 sm:h-44 my-1 flex items-center justify-center">
                      <StickerThemes />
                    </div>

                    <p className="text-xs sm:text-sm md:text-base text-[var(--text-secondary)] font-medium leading-relaxed max-w-sm md:max-w-lg">
                      Gentle Material Design tones. Test light cream or dark cinema mode and pick your favorite palette.
                    </p>

                    {/* Interactive Theme Picker */}
                    <div className="w-full max-w-sm md:max-w-lg bg-[var(--bg-surface-card)] p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-[var(--border-subtle)] space-y-3 text-left shadow-2xs">
                      {/* Lighting Mode */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                          Mode
                        </span>
                        <div className="inline-flex p-0.5 rounded-full bg-[var(--chip-bg)] gap-1">
                          <button
                            type="button"
                            onClick={() => onUpdateSettings({ theme: 'cream' })}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition ${
                              settings.theme === 'cream'
                                ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            <Sun className="w-3.5 h-3.5" />
                            <span>Cream</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateSettings({ theme: 'dark-olive' })}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition ${
                              settings.theme === 'dark-olive' || settings.theme === 'oled-black'
                                ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            <Moon className="w-3.5 h-3.5" />
                            <span>Dark</span>
                          </button>
                        </div>
                      </div>

                      {/* Palettes */}
                      <div>
                        <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5">
                          Color Schemes
                        </span>
                        <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                          {colorSchemes.map(cs => {
                            const isSelected = (settings.colorScheme || 'orange') === cs.id;
                            return (
                              <button
                                key={cs.id}
                                type="button"
                                onClick={() => onUpdateSettings({ colorScheme: cs.id })}
                                title={cs.label}
                                className={`h-8 sm:h-9 rounded-xl flex items-center justify-center transition border-2 ${
                                  isSelected
                                    ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/20 scale-105'
                                    : 'border-transparent opacity-85 hover:opacity-100'
                                }`}
                                style={{ backgroundColor: cs.bg }}
                              >
                                <div
                                  className="w-3.5 h-3.5 rounded-full"
                                  style={{ backgroundColor: cs.color }}
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Local-First & Open Source */}
                {currentStep === 4 && (
                  <div className="w-full flex flex-col items-center md:items-start space-y-3 sm:space-y-3.5 animate-fade-in">
                    <div className="space-y-0.5">
                      <div className="text-xs font-extrabold uppercase tracking-widest text-[var(--accent-primary)]">
                        Independence & Trust
                      </div>
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--text-primary)] tracking-tight">
                        Local-First & Open Source
                      </h2>
                    </div>

                    {/* Mobile Sticker */}
                    <div className="md:hidden w-48 h-36 sm:w-56 sm:h-44 my-1 flex items-center justify-center">
                      <StickerOpenSource />
                    </div>

                    <p className="text-xs sm:text-sm md:text-base text-[var(--text-secondary)] font-medium leading-relaxed max-w-sm md:max-w-lg">
                      Your journal belongs only to you. Everything is stored locally on your device with zero telemetry and no tracking.
                    </p>

                    <div className="w-full max-w-sm md:max-w-lg grid grid-cols-2 gap-2 text-left">
                      <div className="p-3 rounded-2xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] space-y-0.5">
                        <ShieldCheck className="w-4 h-4 text-[var(--accent-primary)] mb-1" />
                        <div className="text-xs font-bold text-[var(--text-primary)]">100% Private</div>
                        <div className="text-[11px] text-[var(--text-secondary)]">No ads, telemetry, or remote accounts</div>
                      </div>
                      <div className="p-3 rounded-2xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] space-y-0.5">
                        <CheckCircle2 className="w-4 h-4 text-[var(--accent-primary)] mb-1" />
                        <div className="text-xs font-bold text-[var(--text-primary)]">Offline Resilient</div>
                        <div className="text-[11px] text-[var(--text-secondary)]">Works without network connection</div>
                      </div>
                    </div>

                    {onOpenLicense && (
                      <button
                        type="button"
                        onClick={onOpenLicense}
                        className="w-full max-w-sm md:max-w-lg p-2.5 rounded-2xl bg-[var(--bg-surface-card)] hover:bg-[var(--chip-bg)] border border-[var(--border-subtle)] flex items-center justify-between text-xs font-bold text-[var(--text-primary)] transition active:scale-[0.99] cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Code2 className="w-4 h-4 text-[var(--accent-primary)]" />
                          <span>GNU General Public License v3.0</span>
                        </div>
                        <span className="text-[11px] font-semibold text-[var(--text-secondary)]">View Terms →</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Step 5: Library Restore */}
                {currentStep === 5 && (
                  <div className="w-full flex flex-col items-center md:items-start space-y-3 sm:space-y-3.5 animate-fade-in">
                    <div className="space-y-0.5">
                      <div className="text-xs font-extrabold uppercase tracking-widest text-[var(--accent-primary)]">
                        Library Migration
                      </div>
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--text-primary)] tracking-tight">
                        Restore Previous Backup
                      </h2>
                    </div>

                    {/* Mobile Sticker */}
                    <div className="md:hidden w-48 h-36 sm:w-56 sm:h-44 my-1 flex items-center justify-center">
                      <StickerAllSet />
                    </div>

                    <p className="text-xs sm:text-sm md:text-base text-[var(--text-secondary)] font-medium leading-relaxed max-w-sm md:max-w-lg">
                      Do you have an exported journal backup from another device? You can restore it right now.
                    </p>

                    {/* Upload Backup Card */}
                    <div className="w-full max-w-sm md:max-w-lg space-y-2">
                      <label className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-[var(--bg-surface-card)] border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--accent-primary)] cursor-pointer transition active:scale-[0.99] shadow-2xs group">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[var(--accent-secondary)] text-[var(--accent-secondary-text)] flex items-center justify-center shrink-0">
                            <Upload className="w-4 h-4 stroke-[2.5]" />
                          </div>
                          <div className="text-left">
                            <div className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition">
                              Upload Backup File (.json)
                            </div>
                            <div className="text-[11px] text-[var(--text-secondary)]">
                              Restore watchlists, notes, and custom lists
                            </div>
                          </div>
                        </div>
                        <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-[var(--chip-bg)] text-xs font-bold text-[var(--text-primary)]">
                          Browse
                        </span>
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleBackupUpload}
                          className="hidden"
                        />
                      </label>

                      {restoreStatus && (
                        <div
                          className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                            restoreStatus.success
                              ? 'bg-[var(--chip-bg)] text-[var(--accent-primary)] border border-[var(--border-subtle)]'
                              : 'bg-[var(--chip-bg)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
                          }`}
                        >
                          {restoreStatus.success ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 shrink-0" />
                          )}
                          <span>{restoreStatus.message}</span>
                        </div>
                      )}

                      <p className="text-[11px] text-[var(--text-secondary)] text-center md:text-left">
                        No backup yet? That's fine — continue to start with a pristine clean slate.
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 6: Install PWA */}
                {currentStep === 6 && (
                  <div className="w-full flex flex-col items-center md:items-start space-y-3 sm:space-y-3.5 animate-fade-in">
                    <div className="space-y-0.5">
                      <div className="text-xs font-extrabold uppercase tracking-widest text-[var(--accent-primary)]">
                        App Installation
                      </div>
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--text-primary)] tracking-tight">
                        Install as Web App
                      </h2>
                    </div>

                    {/* Mobile Sticker */}
                    <div className="md:hidden w-48 h-36 sm:w-56 sm:h-44 my-1 flex items-center justify-center">
                      <StickerPWA />
                    </div>

                    <p className="text-xs sm:text-sm md:text-base text-[var(--text-secondary)] font-medium leading-relaxed max-w-sm md:max-w-lg">
                      Install EHSAAN PLAY to your home screen or desktop for the fastest, standalone native cinema experience.
                    </p>

                    {/* 4 PWA Benefits Grid */}
                    <div className="w-full max-w-sm md:max-w-lg grid grid-cols-2 gap-2 text-left">
                      <div className="p-2.5 sm:p-3 rounded-2xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] space-y-0.5">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-[var(--text-primary)]">
                          <Maximize2 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                          <span>Fullscreen</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
                          No browser address bar or tabs
                        </p>
                      </div>

                      <div className="p-2.5 sm:p-3 rounded-2xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] space-y-0.5">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-[var(--text-primary)]">
                          <Zap className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                          <span>Instant Launch</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
                          Loads in milliseconds offline
                        </p>
                      </div>

                      <div className="p-2.5 sm:p-3 rounded-2xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] space-y-0.5">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-[var(--text-primary)]">
                          <HardDrive className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                          <span>Zero Bloat</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
                          Takes under 5MB of storage
                        </p>
                      </div>

                      <div className="p-2.5 sm:p-3 rounded-2xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] space-y-0.5">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-[var(--text-primary)]">
                          <Smartphone className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                          <span>Home Launcher</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
                          1-tap desktop/mobile launcher
                        </p>
                      </div>
                    </div>

                    {/* Install Action Card */}
                    <div className="w-full max-w-sm md:max-w-lg pt-0.5">
                      {isInstalled || installSuccess ? (
                        <div className="p-3 rounded-2xl bg-[var(--accent-secondary)] text-[var(--accent-secondary-text)] border border-[var(--border-subtle)] text-xs font-bold flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[var(--accent-secondary-text)]" />
                          <span>App is installed on this device!</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={handleInstallClick}
                            className="w-full py-3 px-4 rounded-2xl bg-[var(--accent-primary)] text-[var(--bg-primary)] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition shadow-xs cursor-pointer"
                          >
                            <Download className="w-4 h-4 stroke-[2.5]" />
                            <span>Install Web App Now</span>
                          </button>
                          {isIOS ? (
                            <div className="p-2.5 rounded-2xl bg-[var(--chip-bg)] text-[var(--text-secondary)] text-[11px] font-medium flex items-center gap-2.5 text-left border border-[var(--border-subtle)]">
                              <Share2 className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                              <span>On iOS Safari: Tap <strong>Share</strong>, then select <strong>Add to Home Screen</strong>.</span>
                            </div>
                          ) : (
                            <div className="p-2.5 rounded-2xl bg-[var(--chip-bg)] text-[var(--text-secondary)] text-[11px] font-medium text-center border border-[var(--border-subtle)]">
                              <span>Clicking above triggers the browser install prompt window.</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* ========================================================= */}
            {/* BOTTOM CONTROLS ROW: Unified Relay Fullscreen Pill Style  */}
            {/* ========================================================= */}
            <div className="shrink-0 w-full px-5 sm:px-8 lg:px-10 pb-5 sm:pb-6 pt-3 bg-[var(--bg-primary)] border-t border-[var(--border-subtle)]/30">
              <div className="w-full max-w-lg mx-auto md:mx-0 flex items-center justify-between gap-4">
                {/* Left: Stepped Material 3 Expressive Progress Dots */}
                <div className="flex items-center gap-1.5 sm:gap-2" aria-label="Guide page indicator">
                  {stepLabels.map((label, idx) => {
                    const isActive = currentStep === idx;
                    const isPast = currentStep > idx;
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setCurrentStep(idx)}
                        aria-label={`Go to step ${idx + 1}: ${label}`}
                        title={`Step ${idx + 1}: ${label}`}
                        className={`h-2.5 rounded-full transition-all duration-200 cursor-pointer ${
                          isActive
                            ? 'w-7 bg-[var(--accent-primary)]'
                            : isPast
                            ? 'w-2.5 bg-[var(--accent-primary)]/45 hover:bg-[var(--accent-primary)]/70'
                            : 'w-2.5 bg-[var(--text-secondary)]/28 hover:bg-[var(--text-secondary)]/50'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Right: Expressive Pill CTA matching Fullscreen Prompt Page */}
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label={currentStep === totalSteps - 1 ? 'Explore Cinema' : 'Next Step'}
                  className="inline-flex items-center gap-3 pl-2 pr-6 py-2 min-h-[50px] sm:min-h-[54px] rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] font-extrabold text-sm sm:text-base shadow-lg hover:opacity-92 active:scale-95 transition cursor-pointer whitespace-nowrap shrink-0 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2"
                >
                  <span className="w-9 h-9 rounded-full bg-[var(--bg-primary)]/20 flex items-center justify-center shrink-0">
                    {currentStep === totalSteps - 1 ? (
                      <Compass className="w-4 h-4 stroke-[2.6] group-hover:rotate-45 transition-transform" />
                    ) : (
                      <ArrowRight className="w-4 h-4 stroke-[2.6] group-hover:translate-x-0.5 transition-transform" />
                    )}
                  </span>
                  <span>{currentStep === totalSteps - 1 ? 'Explore Cinema' : 'Next'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

/* =================================================================== */
/* THEME-SYNCED VECTOR STICKER COMPONENTS                              */
/* =================================================================== */

function buildScallopedBadgePath(scale = 260, lobes = 12, amplitude = 0.036): string {
  const half = scale / 2;
  const baseRadius = 0.435 * scale;
  const amp = amplitude * scale;
  const samples = lobes * 6;
  const pts: [number, number][] = [];

  for (let i = 0; i < samples; i++) {
    const theta = (i / samples) * Math.PI * 2;
    const r = baseRadius + amp * Math.cos(lobes * theta);
    pts.push([half + r * Math.cos(theta), half + r * Math.sin(theta)]);
  }

  const n = pts.length;
  const fmt = (v: number) => Number(v.toFixed(3));
  let d = `M ${fmt(pts[0][0])} ${fmt(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${fmt(cp1x)} ${fmt(cp1y)}, ${fmt(cp2x)} ${fmt(cp2y)}, ${fmt(p2[0])} ${fmt(p2[1])}`;
  }
  return `${d} Z`;
}

function StickerFullscreen() {
  const scallopPath = useMemo(() => buildScallopedBadgePath(260, 12, 0.036), []);

  return (
    <svg viewBox="0 0 260 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full overflow-visible drop-shadow-sm">
      <g className="sticker-orbit-slow">
        <path
          d={scallopPath}
          fill="var(--bg-card-olive)"
          fillOpacity="0.82"
          stroke="var(--border-subtle)"
          strokeWidth="1.5"
        />
      </g>

      <circle
        cx="130"
        cy="130"
        r="76"
        fill="var(--bg-surface-card)"
        fillOpacity="0.22"
        className="sticker-breathe"
      />

      <g className="sticker-float-slow">
        <rect
          x="76"
          y="100"
          width="74"
          height="74"
          rx="24"
          fill="var(--bg-card-yellow)"
          stroke="var(--bg-primary)"
          strokeOpacity="0.16"
          strokeWidth="1.5"
        />
      </g>

      <g className="sticker-float-alt">
        <circle
          cx="154"
          cy="108"
          r="41"
          fill="var(--accent-secondary)"
          fillOpacity="0.92"
        />
      </g>

      <g className="sticker-breathe">
        <rect
          x="104"
          y="102"
          width="50"
          height="50"
          rx="18"
          fill="var(--bg-primary)"
          fillOpacity="0.22"
        />
        <path
          d="M117 121 V113 H125 M143 121 V113 H135 M117 133 V141 H125 M143 133 V141 H135"
          stroke="var(--accent-primary)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="sticker-pulse-soft"
        />
      </g>

      <path
        d="M210 56 L213 63 L220 66 L213 69 L210 76 L207 69 L200 66 L207 63 Z"
        fill="var(--accent-primary)"
        className="sticker-twinkle"
      />
      <path
        d="M48 188 L50 193 L55 195 L50 197 L48 202 L46 197 L41 195 L46 193 Z"
        fill="var(--accent-primary)"
        fillOpacity="0.85"
        className="sticker-twinkle-delay"
      />
      <circle cx="54" cy="70" r="4" fill="var(--accent-primary)" fillOpacity="0.55" className="sticker-pulse-soft sticker-delay-2" />
    </svg>
  );
}

function StickerWelcome() {
  return (
    <svg viewBox="0 0 300 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm overflow-visible">
      <polygon points="25,50 280,10 280,180 25,70" fill="var(--bg-card-yellow)" opacity="0.36" className="sticker-pulse-soft" />
      <path d="M220 40 L225 50 L235 55 L225 60 L220 70 L215 60 L205 55 L215 50 Z" fill="var(--accent-primary)" opacity="0.8" className="sticker-twinkle" />
      <path d="M260 85 L263 92 L270 95 L263 98 L260 105 L257 98 L250 95 L257 92 Z" fill="var(--accent-primary)" opacity="0.6" className="sticker-twinkle-delay" />
      <circle cx="245" cy="130" r="4" fill="var(--accent-primary)" opacity="0.7" className="sticker-breathe sticker-delay-1" />
      <circle cx="210" cy="95" r="3" fill="var(--accent-primary)" opacity="0.5" className="sticker-breathe sticker-delay-3" />

      <g transform="translate(195, 70)" opacity="0.95">
        <g className="sticker-float-alt">
          <rect x="0" y="0" width="28" height="22" rx="4" fill="var(--bg-card-olive)" stroke="var(--text-primary)" strokeWidth="2" />
          <circle cx="7" cy="7" r="1.6" fill="var(--text-primary)" className="sticker-pulse-soft" />
          <circle cx="21" cy="7" r="1.6" fill="var(--text-primary)" className="sticker-pulse-soft sticker-delay-1" />
          <circle cx="7" cy="15" r="1.6" fill="var(--text-primary)" className="sticker-pulse-soft sticker-delay-2" />
          <circle cx="21" cy="15" r="1.6" fill="var(--text-primary)" className="sticker-pulse-soft sticker-delay-3" />
        </g>
      </g>

      <path
        d="M70 175 C70 140 85 110 115 110 L135 110 C145 110 152 118 152 128 L152 175 Z"
        fill="var(--accent-secondary)"
        stroke="var(--accent-secondary-text)"
        strokeWidth="2.5"
      />
      <rect x="62" y="150" width="35" height="26" rx="8" fill="var(--accent-secondary)" stroke="var(--accent-secondary-text)" strokeWidth="2" />

      <path d="M110 175 L115 192 L140 192" stroke="var(--text-primary)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path
        d="M100 165 C95 140 105 125 120 120 C135 115 145 130 148 155 Z"
        fill="var(--bg-card-olive)"
        stroke="var(--text-primary)"
        strokeWidth="2.5"
      />
      <g className="sticker-breathe">
        <circle cx="126" cy="102" r="13" fill="var(--text-primary)" />
        <path d="M116 100 C116 92 136 92 136 100" stroke="var(--bg-card-olive)" strokeWidth="4" strokeLinecap="round" fill="none" />
        <circle cx="116" cy="103" r="4.5" fill="var(--accent-primary)" className="sticker-pulse-soft" />
        <circle cx="136" cy="103" r="4.5" fill="var(--accent-primary)" className="sticker-pulse-soft sticker-delay-2" />
      </g>

      <path d="M125 135 L145 140 L152 130" stroke="var(--text-primary)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      <g transform="translate(142, 126)">
        <g className="sticker-wiggle">
          <polygon points="4,10 10,40 32,40 38,10" fill="var(--bg-card-yellow)" stroke="var(--text-primary)" strokeWidth="2.5" />
          <line x1="14" y1="12" x2="17" y2="38" stroke="var(--text-card-yellow)" strokeWidth="2.5" />
          <line x1="22" y1="12" x2="23" y2="38" stroke="var(--text-card-yellow)" strokeWidth="2.5" />
          <line x1="30" y1="12" x2="29" y2="38" stroke="var(--text-card-yellow)" strokeWidth="2.5" />
          <circle cx="10" cy="8" r="4.5" fill="#FFFBEB" stroke="var(--text-primary)" strokeWidth="1.5" className="sticker-pulse-soft" />
          <circle cx="18" cy="5" r="5.5" fill="#FEF08A" stroke="var(--text-primary)" strokeWidth="1.5" className="sticker-pulse-soft sticker-delay-1" />
          <circle cx="26" cy="6" r="5" fill="#FFFBEB" stroke="var(--text-primary)" strokeWidth="1.5" className="sticker-pulse-soft sticker-delay-2" />
          <circle cx="33" cy="9" r="4" fill="#FEF08A" stroke="var(--text-primary)" strokeWidth="1.5" className="sticker-pulse-soft sticker-delay-3" />
        </g>
      </g>
      <circle cx="152" cy="108" r="3.5" fill="#FEF08A" stroke="var(--text-primary)" strokeWidth="1.5" className="sticker-float-slow" />

      <path
        d="M15 200 C30 192 45 192 60 200 C75 208 90 208 105 200 C120 192 135 192 150 200 C165 208 180 208 195 200 C210 192 225 192 240 200 C255 208 270 208 285 200"
        stroke="var(--text-primary)"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function StickerOMDb() {
  const scallopPath = useMemo(() => buildScallopedBadgePath(220, 10, 0.034), []);

  return (
    <svg viewBox="0 0 240 205" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm overflow-visible">
      {/* Expressive Tonal Metadata Scallop Backdrop (No gray blob) */}
      <g transform="translate(10, -8)">
        <g className="sticker-orbit-slow">
          <path
            d={scallopPath}
            fill="var(--bg-card-olive)"
            fillOpacity="0.78"
            stroke="var(--border-subtle)"
            strokeWidth="1.5"
          />
        </g>
      </g>

      {/* Subtle Dashed Metadata Orbit Ring */}
      <circle
        cx="120"
        cy="102"
        r="84"
        stroke="var(--accent-primary)"
        strokeOpacity="0.24"
        strokeWidth="1.5"
        strokeDasharray="6 6"
        className="sticker-breathe"
      />

      {/* Twinkling Sparkles */}
      <path
        d="M32 34 L35 41 L42 44 L35 47 L32 54 L29 47 L22 44 L29 41 Z"
        fill="var(--accent-primary)"
        className="sticker-twinkle"
      />
      <path
        d="M212 72 L214.5 77.5 L220 80 L214.5 82.5 L212 88 L209.5 82.5 L204 80 L209.5 77.5 Z"
        fill="var(--accent-primary)"
        fillOpacity="0.8"
        className="sticker-twinkle-delay"
      />

      {/* Center Focal Element: Rich Cinema Metadata Inspector Card */}
      <g transform="translate(42, 34)">
        <g className="sticker-float-slow">
          {/* Card Frame */}
          <rect
            x="0"
            y="0"
            width="156"
            height="122"
            rx="20"
            fill="var(--bg-surface-card)"
            stroke="var(--text-primary)"
            strokeWidth="2.4"
          />

          {/* Top Metadata Window Header Bar */}
          <path
            d="M2 18 C2 9.163 9.163 2 18 2 H138 C146.837 2 154 9.163 154 18 V24 H2 V18 Z"
            fill="var(--accent-secondary)"
            fillOpacity="0.65"
          />
          <circle cx="14" cy="13" r="3" fill="var(--accent-primary)" />
          <circle cx="24" cy="13" r="3" fill="var(--text-secondary)" fillOpacity="0.45" />
          <circle cx="34" cy="13" r="3" fill="var(--text-secondary)" fillOpacity="0.25" />
          <rect x="98" y="8" width="44" height="10" rx="5" fill="var(--accent-primary)" />
          <text x="107" y="15.5" fontFamily="sans-serif" fontSize="6.5" fontWeight="900" fill="var(--bg-primary)" letterSpacing="0.5">
            METADATA
          </text>

          {/* Left: Mini Poster Artwork Thumbnail */}
          <rect
            x="12"
            y="32"
            width="46"
            height="62"
            rx="10"
            fill="var(--accent-secondary)"
            stroke="var(--accent-primary)"
            strokeWidth="1.8"
          />
          {/* Poster Clapper Top Stripes */}
          <path d="M13 40 C13 35.5 16.5 33 21 33 H49 C53.5 33 57 35.5 57 40 V44 H13 V40 Z" fill="var(--accent-primary)" />
          <line x1="22" y1="33" x2="26" y2="44" stroke="var(--bg-primary)" strokeWidth="2" />
          <line x1="34" y1="33" x2="38" y2="44" stroke="var(--bg-primary)" strokeWidth="2" />
          <line x1="46" y1="33" x2="50" y2="44" stroke="var(--bg-primary)" strokeWidth="2" />
          {/* Play Triangle Inside Poster */}
          <polygon points="31,57 31,73 43,65" fill="var(--accent-primary)" className="sticker-pulse-soft" />

          {/* Right: Structured Movie Metadata Fields */}
          {/* Title Bar */}
          <rect x="68" y="34" width="74" height="9" rx="4.5" fill="var(--text-primary)" fillOpacity="0.88" />

          {/* Year & Runtime Metadata Pills */}
          <rect x="68" y="49" width="32" height="13" rx="6.5" fill="var(--bg-card-yellow)" stroke="var(--text-card-yellow)" strokeOpacity="0.35" strokeWidth="1" />
          <text x="75" y="58" fontFamily="sans-serif" fontSize="7.5" fontWeight="900" fill="var(--text-card-yellow)">
            2026
          </text>
          <rect x="104" y="49" width="36" height="13" rx="6.5" fill="var(--bg-card-olive)" stroke="var(--text-card-olive)" strokeOpacity="0.35" strokeWidth="1" />
          <text x="111" y="58" fontFamily="sans-serif" fontSize="7.5" fontWeight="800" fill="var(--text-card-olive)">
            148m
          </text>

          {/* Genre Tag Chips */}
          <rect x="68" y="67" width="36" height="11" rx="5.5" fill="var(--accent-secondary)" />
          <text x="74" y="75" fontFamily="sans-serif" fontSize="6.5" fontWeight="800" fill="var(--accent-secondary-text)">
            SCI-FI
          </text>
          <rect x="108" y="67" width="36" height="11" rx="5.5" fill="var(--chip-bg)" />
          <text x="113" y="75" fontFamily="sans-serif" fontSize="6.5" fontWeight="800" fill="var(--text-secondary)">
            DRAMA
          </text>

          {/* Plot Synopsis Skeleton Lines */}
          <rect x="68" y="84" width="72" height="4.5" rx="2.25" fill="var(--text-secondary)" fillOpacity="0.38" />
          <rect x="68" y="92" width="52" height="4.5" rx="2.25" fill="var(--text-secondary)" fillOpacity="0.26" />

          {/* Bottom Cast & Crew Metadata Row */}
          <circle cx="19" cy="108" r="6" fill="var(--bg-card-yellow)" stroke="var(--text-primary)" strokeWidth="1.3" />
          <circle cx="33" cy="108" r="6" fill="var(--bg-card-olive)" stroke="var(--text-primary)" strokeWidth="1.3" />
          <circle cx="47" cy="108" r="6" fill="var(--accent-secondary)" stroke="var(--text-primary)" strokeWidth="1.3" />
          <rect x="60" y="105" width="46" height="6" rx="3" fill="var(--text-primary)" fillOpacity="0.22" />
          <rect x="112" y="104" width="30" height="8" rx="4" fill="var(--accent-primary)" fillOpacity="0.2" />
        </g>
      </g>

      {/* Top-Right Floating JSON / API Tag Card */}
      <g transform="translate(164, 14)">
        <g className="sticker-float-alt">
          <rect
            x="0"
            y="0"
            width="54"
            height="36"
            rx="12"
            fill="var(--accent-primary)"
            stroke="var(--bg-primary)"
            strokeWidth="2"
          />
          <text x="11" y="22.5" fontFamily="monospace" fontSize="12" fontWeight="900" fill="var(--bg-primary)">
            {`{API}`}
          </text>
        </g>
      </g>

      {/* Bottom-Left Floating Golden IMDb 8.9 Rating Badge */}
      <g transform="translate(16, 134)">
        <g className="sticker-wiggle">
          <rect
            x="0"
            y="0"
            width="68"
            height="36"
            rx="18"
            fill="#F5C518"
            stroke="#121212"
            strokeWidth="2"
          />
          <path
            d="M19 11 L21.2 16 L26.5 16.4 L22.4 19.8 L23.7 25 L19 22.1 L14.3 25 L15.6 19.8 L11.5 16.4 L16.8 16 Z"
            fill="#121212"
            className="sticker-twinkle"
          />
          <text x="31" y="23" fontFamily="sans-serif" fontSize="13" fontWeight="900" fill="#121212">
            8.9
          </text>
        </g>
      </g>

      {/* Bottom-Right Floating OMDb Live Engine Pill */}
      <g transform="translate(152, 140)">
        <g className="sticker-breathe">
          <rect
            x="0"
            y="0"
            width="68"
            height="34"
            rx="12"
            fill="var(--accent-secondary)"
            stroke="var(--accent-secondary-text)"
            strokeWidth="2"
          />
          <circle cx="14" cy="17" r="4" fill="var(--accent-primary)" className="sticker-pulse-soft" />
          <text x="23" y="21.5" fontFamily="sans-serif" fontSize="11.5" fontWeight="900" fill="var(--accent-secondary-text)">
            OMDb
          </text>
        </g>
      </g>
    </svg>
  );
}

function StickerThemes() {
  return (
    <svg viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm overflow-visible">
      <path
        d="M50 70 C30 30 80 15 130 20 C180 25 215 55 200 100 C185 145 150 170 100 165 C50 160 70 110 50 70 Z"
        fill="var(--bg-card-olive)"
        fillOpacity="0.72"
        stroke="var(--border-subtle)"
        strokeWidth="1.5"
        className="sticker-breathe"
      />
      <g transform="translate(60, 30)">
        <g className="sticker-float-slow">
          <path
            d="M30 10 C60 -5 100 15 95 55 C90 95 55 105 25 90 C-5 75 0 25 30 10 Z"
            fill="var(--bg-surface-card)"
            stroke="var(--text-primary)"
            strokeWidth="2.5"
          />
          <circle cx="68" cy="72" r="9" fill="var(--bg-primary)" stroke="var(--text-primary)" strokeWidth="2" />
          <circle cx="32" cy="28" r="6.5" fill="#4E562F" className="sticker-pulse-soft" />
          <circle cx="55" cy="22" r="6.5" fill="#7C4022" className="sticker-pulse-soft sticker-delay-1" />
          <circle cx="78" cy="35" r="6.5" fill="#2B447A" className="sticker-pulse-soft sticker-delay-2" />
          <circle cx="82" cy="58" r="6.5" fill="#7A2E44" className="sticker-pulse-soft sticker-delay-3" />
          <circle cx="32" cy="68" r="6.5" fill="#2E664F" className="sticker-pulse-soft sticker-delay-4" />
        </g>
      </g>
      <g transform="translate(35, 95)">
        <g className="sticker-float-alt">
          <rect x="0" y="0" width="52" height="52" rx="26" fill="var(--accent-secondary)" stroke="var(--accent-secondary-text)" strokeWidth="2" />
          <path d="M22 14 C17 19 17 29 24 34 C28 36 32 36 35 34 C31 38 23 38 18 33 C13 28 14 20 19 15 Z" fill="var(--accent-secondary-text)" className="sticker-pulse-soft" />
          <circle cx="32" cy="20" r="2.5" fill="var(--accent-secondary-text)" className="sticker-twinkle" />
        </g>
      </g>
      <g transform="translate(145, 105)">
        <g className="sticker-wiggle">
          <rect x="0" y="0" width="60" height="30" rx="15" fill="var(--accent-primary)" />
          <circle cx="45" cy="15" r="11" fill="var(--bg-primary)" className="sticker-breathe" />
          <path d="M41 15 L44 18 L50 12" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sticker-pulse-soft" />
        </g>
      </g>
    </svg>
  );
}

function StickerOpenSource() {
  return (
    <svg viewBox="0 0 240 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm overflow-visible">
      <path
        d="M45 75 C30 35 75 15 125 20 C175 25 210 50 205 100 C200 150 165 180 115 175 C65 170 60 115 45 75 Z"
        fill="var(--bg-card-olive)"
        fillOpacity="0.72"
        stroke="var(--border-subtle)"
        strokeWidth="1.5"
        className="sticker-breathe"
      />
      <g transform="translate(60, 45)">
        <g className="sticker-float-slow">
          <rect x="0" y="0" width="88" height="64" rx="14" fill="var(--bg-surface-card)" stroke="var(--text-primary)" strokeWidth="2.5" />
          <path d="M26 32 L16 40 L26 48" stroke="var(--accent-primary)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="sticker-pulse-soft" />
          <path d="M62 32 L72 40 L62 48" stroke="var(--accent-primary)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="sticker-pulse-soft sticker-delay-2" />
          <line x1="48" y1="26" x2="40" y2="54" stroke="var(--text-secondary)" strokeWidth="3" strokeLinecap="round" className="sticker-pulse-soft sticker-delay-1" />
        </g>
      </g>
      <g transform="translate(35, 115)">
        <g className="sticker-wiggle">
          <path
            d="M26 4 C14 4 6 12 6 22 C6 36 26 46 26 46 C26 46 46 36 46 22 C46 12 38 4 26 4 Z"
            fill="var(--accent-secondary)"
            stroke="var(--accent-secondary-text)"
            strokeWidth="2"
          />
          <g className="sticker-pulse-soft">
            <rect x="20" y="24" width="12" height="10" rx="2" fill="var(--accent-secondary-text)" />
            <path d="M22 24 L22 20 C22 17 30 17 30 20 L30 24" stroke="var(--accent-secondary-text)" strokeWidth="2" fill="none" />
          </g>
        </g>
      </g>
      <g transform="translate(155, 30)">
        <g className="sticker-breathe">
          <circle cx="20" cy="20" r="18" fill="var(--bg-card-yellow)" stroke="var(--text-card-yellow)" strokeWidth="1.5" />
          <path
            d="M20 28 C20 28 11 22 11 16 C11 13 14 11 17 12 C19 13 20 15 20 15 C20 15 21 13 23 12 C26 11 29 13 29 16 C29 22 20 28 20 28 Z"
            fill="var(--text-card-yellow)"
            className="sticker-pulse-soft"
          />
        </g>
      </g>
      <g transform="translate(150, 115)">
        <g className="sticker-float-alt">
          <rect x="0" y="0" width="54" height="38" rx="8" fill="var(--bg-card-olive)" stroke="var(--text-card-olive)" strokeWidth="1.5" />
          <line x1="10" y1="12" x2="44" y2="12" stroke="var(--text-card-olive)" strokeWidth="2" strokeLinecap="round" />
          <line x1="10" y1="20" x2="30" y2="20" stroke="var(--text-card-olive)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="42" cy="26" r="3" fill="var(--text-card-olive)" className="sticker-twinkle" />
        </g>
      </g>
    </svg>
  );
}

function StickerAllSet() {
  return (
    <svg viewBox="0 0 240 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm overflow-visible">
      <g transform="rotate(-6 120 100)">
        <rect
          x="40"
          y="35"
          width="160"
          height="125"
          rx="26"
          fill="var(--bg-card-olive)"
          fillOpacity="0.74"
          stroke="var(--border-subtle)"
          strokeWidth="1.5"
          className="sticker-breathe"
        />
      </g>
      <g transform="translate(25, 45)">
        <g className="sticker-float-alt">
          <circle cx="22" cy="22" r="20" fill="var(--bg-surface-card)" stroke="var(--border-subtle)" strokeWidth="1.5" />
          <path
            d="M22 30 C22 30 14 24 14 18 C14 15 17 13 20 14 C21.5 15 22 16.5 22 16.5 C22 16.5 22.5 15 24 14 C27 13 30 15 30 18 C30 24 22 30 22 30 Z"
            fill="var(--accent-primary)"
            className="sticker-pulse-soft"
          />
        </g>
      </g>
      <g transform="translate(165, 55)">
        <g className="sticker-twinkle">
          <path
            d="M26 36 C26 36 15 28 15 20 C15 16 19 13.5 23 15 C25 16.5 26 18 26 18 C26 18 27 16.5 29 15 C33 13.5 37 16 37 20 C37 28 26 36 26 36 Z"
            fill="var(--accent-primary)"
          />
        </g>
      </g>
      <g transform="translate(165, 120)">
        <g className="sticker-wiggle">
          <circle cx="24" cy="24" r="22" fill="var(--bg-card-yellow)" stroke="var(--text-card-yellow)" strokeOpacity="0.4" strokeWidth="1.5" />
          <polygon points="12,32 16,18 28,28" fill="none" stroke="var(--text-card-yellow)" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M28 20 C32 18 34 14 36 12" stroke="var(--text-card-yellow)" strokeWidth="2" strokeLinecap="round" className="sticker-twinkle-delay" />
          <path d="M30 24 C36 23 38 21 41 20" stroke="var(--text-card-yellow)" strokeWidth="2" strokeLinecap="round" className="sticker-twinkle" />
          <path d="M26 26 C30 28 32 30 35 32" stroke="var(--text-card-yellow)" strokeWidth="2" strokeLinecap="round" className="sticker-twinkle-delay" />
        </g>
      </g>
      <g transform="translate(40, 125)">
        <g className="sticker-orbit-slow">
          <circle cx="16" cy="16" r="14" fill="var(--accent-secondary)" />
          <circle cx="16" cy="16" r="5" fill="none" stroke="var(--accent-secondary-text)" strokeWidth="3" />
          <circle cx="16" cy="7" r="2.5" fill="var(--accent-secondary-text)" />
          <circle cx="16" cy="25" r="2.5" fill="var(--accent-secondary-text)" />
          <circle cx="7" cy="16" r="2.5" fill="var(--accent-secondary-text)" />
          <circle cx="25" cy="16" r="2.5" fill="var(--accent-secondary-text)" />
        </g>
      </g>
      <g transform="translate(85, 65)">
        <g className="sticker-breathe">
          <circle cx="35" cy="35" r="34" fill="var(--bg-surface-card)" stroke="var(--text-primary)" strokeWidth="5" />
          <path
            d="M24 35 L32 44 L48 24"
            stroke="var(--accent-primary)"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            className="sticker-pulse-soft"
          />
        </g>
      </g>
    </svg>
  );
}

function StickerPWA() {
  return (
    <svg viewBox="0 0 240 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm overflow-visible">
      <path
        d="M50 70 C30 30 80 15 130 20 C180 25 215 55 200 100 C185 145 150 170 100 165 C50 160 70 110 50 70 Z"
        fill="var(--bg-card-olive)"
        fillOpacity="0.72"
        stroke="var(--border-subtle)"
        strokeWidth="1.5"
        className="sticker-breathe"
      />

      <g transform="translate(75, 30)">
        <g className="sticker-float-slow">
          <rect x="0" y="0" width="90" height="140" rx="18" fill="var(--bg-surface-card)" stroke="var(--text-primary)" strokeWidth="3" />
          <line x1="36" y1="8" x2="54" y2="8" stroke="var(--text-secondary)" strokeWidth="2.5" strokeLinecap="round" />
          <rect x="6" y="16" width="78" height="106" rx="10" fill="var(--bg-primary)" />
          <g transform="translate(24, 44)">
            <g className="sticker-breathe">
              <rect x="0" y="6" width="42" height="32" rx="5" fill="var(--accent-primary)" />
              <polygon points="17,16 17,28 28,22" fill="var(--bg-primary)" className="sticker-pulse-soft" />
              <rect x="0" y="0" width="42" height="6" rx="2" fill="var(--text-primary)" />
            </g>
          </g>
          <line x1="30" y1="130" x2="60" y2="130" stroke="var(--text-primary)" strokeWidth="3" strokeLinecap="round" />
        </g>
      </g>

      <g transform="translate(30, 85)">
        <g className="sticker-float-alt">
          <circle cx="26" cy="26" r="24" fill="var(--accent-secondary)" stroke="var(--accent-secondary-text)" strokeWidth="2" />
          <g className="sticker-pulse-soft">
            <path d="M26 14 L26 34" stroke="var(--accent-secondary-text)" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M18 26 L26 34 L34 26" stroke="var(--accent-secondary-text)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <line x1="16" y1="38" x2="36" y2="38" stroke="var(--accent-secondary-text)" strokeWidth="3" strokeLinecap="round" />
        </g>
      </g>

      <g transform="translate(160, 45)">
        <g className="sticker-wiggle">
          <circle cx="22" cy="22" r="20" fill="var(--bg-card-yellow)" stroke="var(--text-card-yellow)" strokeWidth="1.5" />
          <path d="M23 11 L14 23 L21 23 L19 33 L29 19 L23 19 Z" fill="var(--text-card-yellow)" className="sticker-twinkle" />
        </g>
      </g>

      <g transform="translate(170, 125)">
        <g className="sticker-twinkle-delay">
          <path d="M16 4 L18 12 L26 14 L18 16 L16 24 L14 16 L6 14 L14 12 Z" fill="var(--accent-primary)" />
        </g>
      </g>
    </svg>
  );
}
