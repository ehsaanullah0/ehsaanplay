import React, { useState, useEffect, useCallback } from 'react';
import { UserSettings } from '../../types/movie';
import { ImportResult } from '../../services/storage';
import { usePWAInstall } from '../../hooks/usePWAInstall';
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
  WifiOff,
  Github,
  HardDrive,
  Download,
  Smartphone,
  Zap,
  Maximize2,
  Share2,
  AlertTriangle,
} from 'lucide-react';

interface StartGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  onRestoreBackup: (json: string) => ImportResult | boolean;
}

export const StartGuideModal: React.FC<StartGuideModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onRestoreBackup,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [customKeyInput, setCustomKeyInput] = useState<string>(settings.tmdbApiKey || '');
  const [isKeySaved, setIsKeySaved] = useState<boolean>(false);
  const [restoreStatus, setRestoreStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [installSuccess, setInstallSuccess] = useState(false);
  const [showPwaWarning, setShowPwaWarning] = useState(false);

  const totalSteps = 6; // 0: Welcome, 1: TMDB, 2: Colors, 3: Privacy, 4: Restore, 5: Install PWA

  const handleForceComplete = useCallback(() => {
    setShowPwaWarning(false);
    try {
      localStorage.setItem('ehsaan_start_guide_completed_v1', 'true');
    } catch {
      // ignore
    }
    onClose();
  }, [onClose]);

  const handleComplete = useCallback(() => {
    const isCurrentlyInstalled = isInstalled || installSuccess;
    if (!isCurrentlyInstalled) {
      setShowPwaWarning(true);
      return;
    }
    handleForceComplete();
  }, [isInstalled, installSuccess, handleForceComplete]);

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

  const handleWarningInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstallSuccess(true);
        setShowPwaWarning(false);
        setTimeout(() => {
          handleForceComplete();
        }, 500);
        return;
      }
    }
    // If not immediately installable or failed, navigate user to Step 5 (Install PWA)
    setCurrentStep(5);
    setShowPwaWarning(false);
  };

  const handleGoToInstallStep = () => {
    setCurrentStep(5);
    setShowPwaWarning(false);
  };

  // Keyboard navigation for desktop users
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (showPwaWarning) {
        if (e.key === 'Escape') {
          e.preventDefault();
          handleForceComplete();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleWarningInstallClick();
        }
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
  }, [isOpen, showPwaWarning, handleNext, handlePrev, handleComplete, handleForceComplete, handleWarningInstallClick]);

  if (!isOpen) return null;

  const handleSaveTmdbKey = () => {
    const trimmed = customKeyInput.trim();
    onUpdateSettings({ tmdbApiKey: trimmed });
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
            handleForceComplete();
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
    { id: 'olive', label: 'Olive Green', color: '#4E562F', bg: '#E4EAB8' },
    { id: 'orange', label: 'Warm Peach', color: '#7C4022', bg: '#FFCCA7' },
    { id: 'blue', label: 'Sky Blue', color: '#2B447A', bg: '#B6CFFC' },
    { id: 'pink', label: 'Rose Blush', color: '#7A2E44', bg: '#F8B4C8' },
    { id: 'purple', label: 'Lavender', color: '#4A2E7A', bg: '#D0B4F8' },
    { id: 'mint', label: 'Fresh Sage', color: '#2E664F', bg: '#B4F8D8' },
  ];

  const stepLabels = [
    'Welcome',
    'TMDB Data',
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
              {currentStep === 0 && 'The Welcome Note'}
              {currentStep === 1 && 'Metadata Engine'}
              {currentStep === 2 && 'Calm Palettes'}
              {currentStep === 3 && 'Independence'}
              {currentStep === 4 && 'Library Migration'}
              {currentStep === 5 && 'Standalone PWA'}
            </div>

            {/* Center Sticker Artwork with standard responsive bounds */}
            <div className="relative z-10 w-full flex items-center justify-center my-auto py-2">
              {currentStep === 0 && (
                <div className="w-64 h-52 lg:w-72 lg:h-60 flex items-center justify-center animate-fade-in">
                  <StickerWelcome />
                </div>
              )}
              {currentStep === 1 && (
                <div className="w-60 h-48 lg:w-68 lg:h-56 flex items-center justify-center animate-fade-in">
                  <StickerTMDB />
                </div>
              )}
              {currentStep === 2 && (
                <div className="w-60 h-48 lg:w-68 lg:h-56 flex items-center justify-center animate-fade-in">
                  <StickerThemes />
                </div>
              )}
              {currentStep === 3 && (
                <div className="w-60 h-48 lg:w-68 lg:h-56 flex items-center justify-center animate-fade-in">
                  <StickerOpenSource />
                </div>
              )}
              {currentStep === 4 && (
                <div className="w-60 h-48 lg:w-68 lg:h-56 flex items-center justify-center animate-fade-in">
                  <StickerAllSet />
                </div>
              )}
              {currentStep === 5 && (
                <div className="w-60 h-48 lg:w-68 lg:h-56 flex items-center justify-center animate-fade-in">
                  <StickerPWA />
                </div>
              )}
            </div>

            {/* Bottom Philosophy Caption on Desktop */}
            <div className="relative z-10 w-full max-w-xs px-3.5 py-2 rounded-2xl bg-[var(--bg-surface-card)]/85 border border-[var(--border-subtle)] text-center text-[11px] font-semibold text-[var(--text-secondary)] shadow-2xs">
              {currentStep === 0 && 'Start fresh with zero sample clutter. Add only movies you love.'}
              {currentStep === 1 && 'Connected with TMDB for rich posters, synopses, and cast.'}
              {currentStep === 2 && 'Material 3 colors tailored for daylight and midnight cinema.'}
              {currentStep === 3 && '100% private on your device with zero cloud telemetry.'}
              {currentStep === 4 && 'Have an exported backup? Restore your collection in seconds.'}
              {currentStep === 5 && 'Install for fullscreen native immersion without browser tabs.'}
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN (Content + Mobile Sticker + Bottom Dock)     */}
          {/* ========================================================= */}
          <div className="md:col-span-7 h-full flex flex-col justify-between overflow-hidden bg-[var(--bg-primary)]">
            
            {/* Scrollable Content Area: Scrolls smoothly from top, no clipping */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 sm:px-8 lg:px-10 flex flex-col justify-start">
              <div className="w-full max-w-lg mx-auto md:mx-0 my-auto flex flex-col items-center md:items-start text-center md:text-left space-y-3.5 sm:space-y-4 py-2">
                
                {/* Step 0: Welcome Note */}
                {currentStep === 0 && (
                  <div className="w-full flex flex-col items-center md:items-start space-y-3 sm:space-y-3.5 animate-fade-in">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--chip-bg)] text-[var(--chip-text)] text-[11px] font-bold tracking-wide">
                        <Sparkles className="w-3 h-3 text-[var(--accent-primary)]" />
                        <span>β Beta • Start Guide</span>
                      </div>
                      <h1 id="start-guide-title" className="text-3xl sm:text-4xl md:text-5xl font-black text-[var(--text-primary)] tracking-tight leading-[1.08]">
                        Welcome to <br className="hidden md:inline" />
                        <span className="text-[var(--accent-primary)]">EHSAAN PLAY</span>
                      </h1>
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

                {/* Step 1: TMDB Cinema Data */}
                {currentStep === 1 && (
                  <div className="w-full flex flex-col items-center md:items-start space-y-3 sm:space-y-3.5 animate-fade-in">
                    <div className="space-y-0.5">
                      <div className="text-xs font-extrabold uppercase tracking-widest text-[var(--accent-primary)]">
                        Metadata Engine
                      </div>
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--text-primary)] tracking-tight">
                        TMDB Cinema Data
                      </h2>
                    </div>

                    {/* Mobile Sticker */}
                    <div className="md:hidden w-48 h-36 sm:w-56 sm:h-44 my-1 flex items-center justify-center">
                      <StickerTMDB />
                    </div>

                    <p className="text-xs sm:text-sm md:text-base text-[var(--text-secondary)] font-medium leading-relaxed max-w-sm md:max-w-lg">
                      EHSAAN PLAY links seamlessly with The Movie Database (TMDB) to fetch real-time posters, trailers, synopses, ratings, and cast members.
                    </p>

                    {/* TMDB Status & Custom Key Card */}
                    <div className="w-full max-w-sm md:max-w-lg bg-[var(--bg-surface-card)] p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-[var(--border-subtle)] space-y-2 text-left shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                          <Key className="w-4 h-4 text-[var(--accent-primary)]" />
                          <span>Global Discovery Status</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">
                          ✓ Connected & Ready
                        </span>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Optional custom TMDB key"
                          value={customKeyInput}
                          onChange={e => setCustomKeyInput(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                        />
                        <button
                          type="button"
                          onClick={handleSaveTmdbKey}
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

                {/* Step 2: Calm Colors & Dark Mode */}
                {currentStep === 2 && (
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
                            const isSelected = (settings.colorScheme || 'olive') === cs.id;
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

                {/* Step 3: Local-First & Open Source */}
                {currentStep === 3 && (
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
                        <ShieldCheck className="w-4 h-4 text-emerald-600 mb-1" />
                        <div className="text-xs font-bold text-[var(--text-primary)]">100% Private</div>
                        <div className="text-[11px] text-[var(--text-secondary)]">No ads, telemetry, or remote accounts</div>
                      </div>
                      <div className="p-3 rounded-2xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] space-y-0.5">
                        <CheckCircle2 className="w-4 h-4 text-[var(--accent-primary)] mb-1" />
                        <div className="text-xs font-bold text-[var(--text-primary)]">Offline Resilient</div>
                        <div className="text-[11px] text-[var(--text-secondary)]">Works without network connection</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Library Restore */}
                {currentStep === 4 && (
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
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
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

                {/* Step 5: Install PWA (The 6th Page) */}
                {currentStep === 5 && (
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
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span>Instant Launch</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
                          Loads in milliseconds offline
                        </p>
                      </div>

                      <div className="p-2.5 sm:p-3 rounded-2xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] space-y-0.5">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-[var(--text-primary)]">
                          <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
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
                        <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-bold flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>App is installed on this device!</span>
                        </div>
                      ) : isInstallable ? (
                        <button
                          type="button"
                          onClick={handleInstallClick}
                          className="w-full py-2.5 px-4 rounded-2xl bg-[var(--accent-primary)] text-[var(--bg-primary)] font-extrabold text-xs flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition shadow-xs"
                        >
                          <Download className="w-4 h-4" />
                          <span>Install Web App Now</span>
                        </button>
                      ) : isIOS ? (
                        <div className="p-2.5 rounded-2xl bg-[var(--chip-bg)] text-[var(--text-secondary)] text-[11px] font-medium flex items-center gap-2.5 text-left border border-[var(--border-subtle)]">
                          <Share2 className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                          <span>On iOS Safari: Tap <strong>Share</strong>, then select <strong>Add to Home Screen</strong>.</span>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-2xl bg-[var(--chip-bg)] text-[var(--text-secondary)] text-[11px] font-medium text-center border border-[var(--border-subtle)]">
                          <span>Tap browser menu (⋮), then choose <strong>Install App</strong> or <strong>Add to Home Screen</strong>.</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* ========================================================= */}
            {/* BOTTOM NAVIGATION DOCK: Symmetrically aligned with content */}
            {/* ========================================================= */}
            <div className="shrink-0 w-full px-5 pb-5 sm:pb-6 pt-2 bg-[var(--bg-primary)] border-t border-[var(--border-subtle)]/30">
              <div className="w-full max-w-lg mx-auto md:mx-0 p-3 sm:p-3.5 rounded-3xl sm:rounded-4xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] shadow-lg flex items-center justify-between">
                
                {/* Left Text Label */}
                <div className="pl-3 text-left">
                  {currentStep === 0 ? (
                    <div className="flex flex-col">
                      <span className="text-sm sm:text-base font-black text-[var(--accent-primary)] tracking-tight">
                        Let's Go!
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-bold text-[var(--text-secondary)]">
                        Quick First-Time Tour
                      </span>
                    </div>
                  ) : currentStep === totalSteps - 1 ? (
                    <div className="flex flex-col">
                      <span className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)] tracking-wide">
                        All Set!
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-bold text-[var(--text-secondary)]">
                        Ready to Explore Cinema
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <span className="text-xs sm:text-sm font-extrabold text-[var(--text-secondary)] tracking-wide">
                        Step {currentStep + 1} of {totalSteps}
                      </span>
                      <span className="hidden sm:inline text-[10px] sm:text-[11px] font-bold text-[var(--text-secondary)]/70">
                        {stepLabels[currentStep]}
                      </span>
                    </div>
                  )}
                </div>

                {/* Right Action Button */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="hidden lg:inline text-[11px] font-medium text-[var(--text-secondary)]/60">
                    {currentStep === totalSteps - 1 ? 'Press Enter to Finish' : 'Press Enter or →'}
                  </span>

                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label={currentStep === totalSteps - 1 ? 'Explore Cinema' : 'Next Step'}
                    className="h-11 sm:h-12 px-5 sm:px-6 rounded-full sm:rounded-3xl bg-[var(--accent-secondary)] text-[var(--accent-secondary-text)] hover:opacity-90 active:scale-95 flex items-center justify-center gap-2 font-black text-xs sm:text-sm transition shadow-xs group"
                  >
                    {currentStep === totalSteps - 1 ? (
                      <>
                        <span>Explore Cinema</span>
                        <Compass className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] group-hover:rotate-45 transition-transform" />
                      </>
                    ) : (
                      <>
                        <span>Next</span>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Warning If User Does Not Install PWA When Exiting First Visit Guide */}
      {showPwaWarning && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none"
        >
          <div className="w-full max-w-md bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-[32px] sm:rounded-[36px] border border-[var(--border-subtle)] p-6 sm:p-7 shadow-2xl space-y-4 text-center animate-scale-up">
            {/* Warning Icon Badge */}
            <div className="w-14 h-14 rounded-3xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
              <AlertTriangle className="w-7 h-7 stroke-[2.5]" />
            </div>

            {/* Warning Header & Copy as requested */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-500/20">
                Display Recommendation Notice
              </div>
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wide leading-snug text-[var(--text-primary)]">
                FOR POLISHED EXPERIENCE AND BETTER ALIGNMENT OF APP STUFF. PLEASE INSTALL THIS WEB APP AS STANDALONE APP
              </h3>
              <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
                otherwise some elements of app feels unusual.. Standalone mode eliminates browser navigation bars, tabs, and viewport shifts for a distraction-free cinematic layout.
              </p>
            </div>

            {/* Quick Benefits Checklist */}
            <div className="p-3 rounded-2xl bg-[var(--bg-surface-elevated)]/60 border border-[var(--border-subtle)] text-left space-y-1.5 text-[11px] text-[var(--text-secondary)]">
              <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
                <Maximize2 className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                <span>Pixel-Perfect Viewport: No address bar jumping or cropping</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
                <Smartphone className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                <span>Native UI Alignment: Smooth bottom dock and touch gestures</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
                <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Instant Launch: 1-tap desktop/home screen launcher</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              {isInstallable ? (
                <button
                  type="button"
                  onClick={handleWarningInstallClick}
                  className="w-full py-3 px-4 rounded-2xl bg-[var(--accent-primary)] text-[var(--bg-primary)] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition shadow-xs"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Install Web App Now</span>
                </button>
              ) : isIOS ? (
                <button
                  type="button"
                  onClick={handleGoToInstallStep}
                  className="w-full py-3 px-4 rounded-2xl bg-[var(--accent-primary)] text-[var(--bg-primary)] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition shadow-xs"
                >
                  <Share2 className="w-4 h-4 stroke-[2.5]" />
                  <span>View iOS Install Guide</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGoToInstallStep}
                  className="w-full py-3 px-4 rounded-2xl bg-[var(--accent-primary)] text-[var(--bg-primary)] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition shadow-xs"
                >
                  <Smartphone className="w-4 h-4 stroke-[2.5]" />
                  <span>View Installation Page</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleForceComplete}
                className="w-full py-2.5 px-4 rounded-2xl bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold text-xs transition active:scale-98 border border-[var(--border-subtle)]"
              >
                Continue Without Installing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* =================================================================== */
/* THEME-SYNCED VECTOR STICKER COMPONENTS                              */
/* =================================================================== */

function StickerWelcome() {
  return (
    <svg viewBox="0 0 300 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
      <polygon points="25,50 280,10 280,180 25,70" fill="var(--bg-card-yellow)" opacity="0.32" />
      <path d="M220 40 L225 50 L235 55 L225 60 L220 70 L215 60 L205 55 L215 50 Z" fill="var(--accent-primary)" opacity="0.8" />
      <path d="M260 85 L263 92 L270 95 L263 98 L260 105 L257 98 L250 95 L257 92 Z" fill="var(--accent-primary)" opacity="0.6" />
      <circle cx="245" cy="130" r="4" fill="var(--accent-primary)" opacity="0.7" />
      <circle cx="210" cy="95" r="3" fill="var(--accent-primary)" opacity="0.5" />

      <g transform="translate(195, 70)" opacity="0.9">
        <rect x="0" y="0" width="24" height="20" rx="3.5" fill="var(--bg-surface-elevated)" stroke="var(--text-primary)" strokeWidth="2" />
        <circle cx="6" cy="6" r="1.5" fill="var(--text-primary)" />
        <circle cx="18" cy="6" r="1.5" fill="var(--text-primary)" />
        <circle cx="6" cy="14" r="1.5" fill="var(--text-primary)" />
        <circle cx="18" cy="14" r="1.5" fill="var(--text-primary)" />
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
        fill="var(--bg-surface-elevated)"
        stroke="var(--text-primary)"
        strokeWidth="2.5"
      />
      <circle cx="126" cy="102" r="13" fill="var(--text-primary)" />
      <path d="M116 100 C116 92 136 92 136 100" stroke="var(--bg-card-olive)" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="116" cy="103" r="4.5" fill="var(--accent-primary)" />
      <circle cx="136" cy="103" r="4.5" fill="var(--accent-primary)" />

      <path d="M125 135 L145 140 L152 130" stroke="var(--text-primary)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      <g transform="translate(142, 126)">
        <polygon points="4,10 10,40 32,40 38,10" fill="var(--bg-card-yellow)" stroke="var(--text-primary)" strokeWidth="2.5" />
        <line x1="14" y1="12" x2="17" y2="38" stroke="var(--text-card-yellow)" strokeWidth="2.5" />
        <line x1="22" y1="12" x2="23" y2="38" stroke="var(--text-card-yellow)" strokeWidth="2.5" />
        <line x1="30" y1="12" x2="29" y2="38" stroke="var(--text-card-yellow)" strokeWidth="2.5" />
        <circle cx="10" cy="8" r="4.5" fill="#FFFBEB" stroke="var(--text-primary)" strokeWidth="1.5" />
        <circle cx="18" cy="5" r="5.5" fill="#FEF08A" stroke="var(--text-primary)" strokeWidth="1.5" />
        <circle cx="26" cy="6" r="5" fill="#FFFBEB" stroke="var(--text-primary)" strokeWidth="1.5" />
        <circle cx="33" cy="9" r="4" fill="#FEF08A" stroke="var(--text-primary)" strokeWidth="1.5" />
      </g>
      <circle cx="152" cy="108" r="3.5" fill="#FEF08A" stroke="var(--text-primary)" strokeWidth="1.5" />

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

function StickerTMDB() {
  return (
    <svg viewBox="0 0 240 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
      <path
        d="M40 80 C30 40 70 20 120 25 C170 30 210 50 205 100 C200 150 170 180 120 175 C70 170 50 120 40 80 Z"
        fill="var(--bg-surface-elevated)"
        opacity="0.8"
      />
      <g transform="translate(65, 45)">
        <g transform="rotate(-12 10 25)">
          <rect x="0" y="8" width="80" height="15" rx="4" fill="var(--accent-primary)" />
          <line x1="16" y1="8" x2="22" y2="23" stroke="var(--bg-primary)" strokeWidth="3" />
          <line x1="32" y1="8" x2="38" y2="23" stroke="var(--bg-primary)" strokeWidth="3" />
          <line x1="48" y1="8" x2="54" y2="23" stroke="var(--bg-primary)" strokeWidth="3" />
          <line x1="64" y1="8" x2="70" y2="23" stroke="var(--bg-primary)" strokeWidth="3" />
        </g>
        <rect x="0" y="28" width="80" height="56" rx="8" fill="var(--accent-primary)" />
        <polygon points="34,46 34,66 52,56" fill="var(--bg-primary)" />
      </g>
      <g transform="translate(145, 30)">
        <rect x="0" y="0" width="46" height="56" rx="6" fill="var(--bg-surface-card)" stroke="var(--text-primary)" strokeWidth="2" />
        <rect x="6" y="8" width="34" height="26" rx="3" fill="var(--accent-secondary)" />
        <circle cx="12" cy="42" r="2.5" fill="var(--text-primary)" />
        <circle cx="23" cy="42" r="2.5" fill="var(--text-primary)" />
        <circle cx="34" cy="42" r="2.5" fill="var(--text-primary)" />
      </g>
      <g transform="translate(30, 115)">
        <rect x="0" y="0" width="60" height="34" rx="17" fill="var(--bg-card-yellow)" stroke="var(--text-card-yellow)" strokeWidth="1.5" />
        <path d="M16 11 L18 16 L23 16 L19 19 L21 24 L16 21 L12 24 L14 19 L10 16 L15 16 Z" fill="var(--text-card-yellow)" />
        <text x="28" y="22" fontFamily="sans-serif" fontSize="12" fontWeight="bold" fill="var(--text-card-yellow)">8.9</text>
      </g>
      <g transform="translate(150, 120)">
        <rect x="0" y="0" width="56" height="32" rx="10" fill="var(--bg-card-olive)" stroke="var(--text-card-olive)" strokeWidth="1.5" />
        <text x="12" y="20" fontFamily="sans-serif" fontSize="11" fontWeight="900" fill="var(--text-card-olive)">TMDB</text>
      </g>
    </svg>
  );
}

function StickerThemes() {
  return (
    <svg viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
      <path
        d="M50 70 C30 30 80 15 130 20 C180 25 215 55 200 100 C185 145 150 170 100 165 C50 160 70 110 50 70 Z"
        fill="var(--bg-surface-elevated)"
        opacity="0.8"
      />
      <g transform="translate(60, 30)">
        <path
          d="M30 10 C60 -5 100 15 95 55 C90 95 55 105 25 90 C-5 75 0 25 30 10 Z"
          fill="var(--bg-surface-card)"
          stroke="var(--text-primary)"
          strokeWidth="2.5"
        />
        <circle cx="68" cy="72" r="9" fill="var(--bg-primary)" stroke="var(--text-primary)" strokeWidth="2" />
        <circle cx="32" cy="28" r="6.5" fill="#4E562F" />
        <circle cx="55" cy="22" r="6.5" fill="#7C4022" />
        <circle cx="78" cy="35" r="6.5" fill="#2B447A" />
        <circle cx="82" cy="58" r="6.5" fill="#7A2E44" />
        <circle cx="32" cy="68" r="6.5" fill="#2E664F" />
      </g>
      <g transform="translate(35, 95)">
        <rect x="0" y="0" width="52" height="52" rx="26" fill="var(--accent-secondary)" stroke="var(--accent-secondary-text)" strokeWidth="2" />
        <path d="M22 14 C17 19 17 29 24 34 C28 36 32 36 35 34 C31 38 23 38 18 33 C13 28 14 20 19 15 Z" fill="var(--accent-secondary-text)" />
        <circle cx="32" cy="20" r="2.5" fill="var(--accent-secondary-text)" />
      </g>
      <g transform="translate(145, 105)">
        <rect x="0" y="0" width="60" height="30" rx="15" fill="var(--accent-primary)" />
        <circle cx="45" cy="15" r="11" fill="var(--bg-primary)" />
        <path d="M41 15 L44 18 L50 12" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

function StickerOpenSource() {
  return (
    <svg viewBox="0 0 240 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
      <path
        d="M45 75 C30 35 75 15 125 20 C175 25 210 50 205 100 C200 150 165 180 115 175 C65 170 60 115 45 75 Z"
        fill="var(--bg-surface-elevated)"
        opacity="0.8"
      />
      <g transform="translate(60, 45)">
        <rect x="0" y="0" width="88" height="64" rx="14" fill="var(--bg-surface-card)" stroke="var(--text-primary)" strokeWidth="2.5" />
        <path d="M26 32 L16 40 L26 48" stroke="var(--accent-primary)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M62 32 L72 40 L62 48" stroke="var(--accent-primary)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="48" y1="26" x2="40" y2="54" stroke="var(--text-secondary)" strokeWidth="3" strokeLinecap="round" />
      </g>
      <g transform="translate(35, 115)">
        <path
          d="M26 4 C14 4 6 12 6 22 C6 36 26 46 26 46 C26 46 46 36 46 22 C46 12 38 4 26 4 Z"
          fill="var(--accent-secondary)"
          stroke="var(--accent-secondary-text)"
          strokeWidth="2"
        />
        <rect x="20" y="24" width="12" height="10" rx="2" fill="var(--accent-secondary-text)" />
        <path d="M22 24 L22 20 C22 17 30 17 30 20 L30 24" stroke="var(--accent-secondary-text)" strokeWidth="2" fill="none" />
      </g>
      <g transform="translate(155, 30)">
        <circle cx="20" cy="20" r="18" fill="var(--bg-card-yellow)" stroke="var(--text-card-yellow)" strokeWidth="1.5" />
        <path
          d="M20 28 C20 28 11 22 11 16 C11 13 14 11 17 12 C19 13 20 15 20 15 C20 15 21 13 23 12 C26 11 29 13 29 16 C29 22 20 28 20 28 Z"
          fill="var(--text-card-yellow)"
        />
      </g>
      <g transform="translate(150, 115)">
        <rect x="0" y="0" width="54" height="38" rx="8" fill="var(--bg-card-olive)" stroke="var(--text-card-olive)" strokeWidth="1.5" />
        <line x1="10" y1="12" x2="44" y2="12" stroke="var(--text-card-olive)" strokeWidth="2" strokeLinecap="round" />
        <line x1="10" y1="20" x2="30" y2="20" stroke="var(--text-card-olive)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="42" cy="26" r="3" fill="var(--text-card-olive)" />
      </g>
    </svg>
  );
}

function StickerAllSet() {
  return (
    <svg viewBox="0 0 240 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
      <g transform="rotate(-6 120 100)">
        <rect x="40" y="35" width="160" height="125" rx="26" fill="var(--bg-surface-elevated)" opacity="0.85" />
      </g>
      <g transform="translate(25, 45)">
        <circle cx="22" cy="22" r="20" fill="var(--bg-surface-card)" opacity="0.9" />
        <path
          d="M22 30 C22 30 14 24 14 18 C14 15 17 13 20 14 C21.5 15 22 16.5 22 16.5 C22 16.5 22.5 15 24 14 C27 13 30 15 30 18 C30 24 22 30 22 30 Z"
          fill="var(--text-secondary)"
        />
      </g>
      <g transform="translate(165, 55)">
        <path
          d="M26 36 C26 36 15 28 15 20 C15 16 19 13.5 23 15 C25 16.5 26 18 26 18 C26 18 27 16.5 29 15 C33 13.5 37 16 37 20 C37 28 26 36 26 36 Z"
          fill="var(--text-secondary)"
        />
      </g>
      <g transform="translate(165, 120)">
        <circle cx="24" cy="24" r="22" fill="var(--bg-surface-card)" opacity="0.9" />
        <polygon points="12,32 16,18 28,28" fill="none" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M28 20 C32 18 34 14 36 12" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" />
        <path d="M30 24 C36 23 38 21 41 20" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" />
        <path d="M26 26 C30 28 32 30 35 32" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g transform="translate(40, 125)">
        <circle cx="16" cy="16" r="14" fill="var(--chip-bg)" />
        <circle cx="16" cy="16" r="5" fill="none" stroke="var(--text-secondary)" strokeWidth="3" />
        <circle cx="16" cy="7" r="2.5" fill="var(--text-secondary)" />
        <circle cx="16" cy="25" r="2.5" fill="var(--text-secondary)" />
        <circle cx="7" cy="16" r="2.5" fill="var(--text-secondary)" />
        <circle cx="25" cy="16" r="2.5" fill="var(--text-secondary)" />
      </g>
      <g transform="translate(85, 65)">
        <circle cx="35" cy="35" r="34" fill="var(--bg-surface-card)" stroke="var(--text-primary)" strokeWidth="5" />
        <path
          d="M24 35 L32 44 L48 24"
          stroke="var(--text-primary)"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

function StickerPWA() {
  return (
    <svg viewBox="0 0 240 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
      {/* Background organic blob */}
      <path
        d="M50 70 C30 30 80 15 130 20 C180 25 215 55 200 100 C185 145 150 170 100 165 C50 160 70 110 50 70 Z"
        fill="var(--bg-surface-elevated)"
        opacity="0.8"
      />

      {/* Stylized Smartphone Frame */}
      <g transform="translate(75, 30)">
        <rect x="0" y="0" width="90" height="140" rx="18" fill="var(--bg-surface-card)" stroke="var(--text-primary)" strokeWidth="3" />
        {/* Screen Speaker / Camera notch */}
        <line x1="36" y1="8" x2="54" y2="8" stroke="var(--text-secondary)" strokeWidth="2.5" strokeLinecap="round" />
        {/* Screen content area */}
        <rect x="6" y="16" width="78" height="106" rx="10" fill="var(--bg-primary)" />
        {/* Cinema Clapper inside phone screen */}
        <g transform="translate(24, 44)">
          <rect x="0" y="6" width="42" height="32" rx="5" fill="var(--accent-primary)" />
          <polygon points="17,16 17,28 28,22" fill="var(--bg-primary)" />
          {/* Top striped bar */}
          <rect x="0" y="0" width="42" height="6" rx="2" fill="var(--text-primary)" />
        </g>
        {/* Home gesture pill */}
        <line x1="30" y1="130" x2="60" y2="130" stroke="var(--text-primary)" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* Floating Download / Arrow Badge (Left) */}
      <g transform="translate(30, 85)">
        <circle cx="26" cy="26" r="24" fill="var(--accent-secondary)" stroke="var(--accent-secondary-text)" strokeWidth="2" />
        <path d="M26 14 L26 34" stroke="var(--accent-secondary-text)" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M18 26 L26 34 L34 26" stroke="var(--accent-secondary-text)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="16" y1="38" x2="36" y2="38" stroke="var(--accent-secondary-text)" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* Floating Lightning / Instant Launch Badge (Right) */}
      <g transform="translate(160, 45)">
        <circle cx="22" cy="22" r="20" fill="var(--bg-card-yellow)" stroke="var(--text-card-yellow)" strokeWidth="1.5" />
        <path d="M23 11 L14 23 L21 23 L19 33 L29 19 L23 19 Z" fill="var(--text-card-yellow)" />
      </g>

      {/* Floating Star Sparkle (Bottom Right) */}
      <g transform="translate(170, 125)">
        <path d="M16 4 L18 12 L26 14 L18 16 L16 24 L14 16 L6 14 L14 12 Z" fill="var(--accent-primary)" />
      </g>
    </svg>
  );
}
