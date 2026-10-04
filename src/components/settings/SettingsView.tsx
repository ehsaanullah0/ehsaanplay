import React, { useState, useEffect } from 'react';
import {
  UserSettings,
  MediaItem,
  DEFAULT_KEYBOARD_SHORTCUTS,
  KeyboardShortcutsConfig,
  DEFAULT_APP_TWEAKS,
  AppTweaksConfig,
} from '../../types/movie';
import {
  exportLibraryBackup,
  getStorageStats,
  StorageStats,
  ImportResult,
} from '../../services/storage';
import {
  getImageCacheStats,
  preCacheLibraryImages,
  clearImageCache,
  checkLibraryCacheStatus,
  ImageCacheStats,
  PreCacheResult,
} from '../../services/imageStorage';
import { testTMDBConnection, DiagnosticResult } from '../../services/tmdb';
import { usePWAInstall, useOnlineStatus, usePWAUpdate } from '../../hooks/usePWAInstall';
import {
  Palette,
  HardDrive,
  Download,
  Upload,
  Trash2,
  Sparkles,
  Key,
  Check,
  Smartphone,
  Activity,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Wifi,
  WifiOff,
  Cloud,
  Database,
  RefreshCw,
  Info,
  Compass,
  LayoutGrid,
  Rows,
  Github,
  ExternalLink,
  Code2,
  Keyboard,
  Command,
  Coffee,
  SlidersHorizontal,
} from 'lucide-react';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  onDeleteAllData: () => void;
  onRestoreBackup: (json: string) => ImportResult | boolean;
  mediaItems?: MediaItem[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onDeleteAllData,
  onRestoreBackup,
  mediaItems = [],
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const { hasUpdate, isUpdating, applyUpdate, checkForUpdate } = usePWAUpdate();
  const isOnline = useOnlineStatus();
  const [storageStats, setStorageStats] = useState<StorageStats>(getStorageStats());
  const [imageCacheStats, setImageCacheStats] = useState<ImageCacheStats>({ count: 0, bytes: 0, formattedSize: '0 KB' });
  const [apiKeyInput, setApiKeyInput] = useState(settings.tmdbApiKey || '');
  const [importFeedback, setImportFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Diagnostic state
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);

  // Pre-cache state & results
  const [isPreCaching, setIsPreCaching] = useState(false);
  const [cacheProgress, setCacheProgress] = useState<{ done: number; total: number; cached: number; failed: number } | null>(null);
  const [preCacheResult, setPreCacheResult] = useState<PreCacheResult | null>(null);

  // Layout mode state (2-grid vs single column view in desktop)
  const [layoutMode, setLayoutMode] = useState<'grid' | 'single'>('grid');

  // Offline transition confirmation state
  const [offlinePrompt, setOfflinePrompt] = useState<{ missingCount: number } | null>(null);

  // Keyboard Shortcuts state & key recorder
  const shortcuts = settings.keyboardShortcuts || DEFAULT_KEYBOARD_SHORTCUTS;
  const [recordingAction, setRecordingAction] = useState<keyof KeyboardShortcutsConfig | null>(null);

  useEffect(() => {
    if (!recordingAction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      let key = e.key;
      if (key === ' ') key = 'Space';

      onUpdateSettings({
        keyboardShortcuts: {
          ...shortcuts,
          [recordingAction]: key,
        },
      });
      setRecordingAction(null);
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [recordingAction, shortcuts, onUpdateSettings]);

  useEffect(() => {
    getImageCacheStats().then(setImageCacheStats);
  }, []);

  const handleRunDiagnostic = async () => {
    setIsRunningDiagnostic(true);
    setDiagnosticResult(null);
    try {
      const result = await testTMDBConnection(settings.tmdbApiKey);
      setDiagnosticResult(result);
    } catch (err: unknown) {
      setDiagnosticResult({
        success: false,
        status: 0,
        message: err instanceof Error ? err.message : 'Unknown diagnostic error',
        latencyMs: 0,
      });
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  const executePreCache = async () => {
    if (mediaItems.length === 0) return;
    setIsPreCaching(true);
    setPreCacheResult(null);
    setOfflinePrompt(null);
    setCacheProgress({ done: 0, total: mediaItems.length * 2, cached: 0, failed: 0 });

    const result = await preCacheLibraryImages(mediaItems, (done, total, cached, failed) => {
      setCacheProgress({ done, total, cached, failed });
    });

    const stats = await getImageCacheStats();
    setImageCacheStats(stats);
    setPreCacheResult(result);
    setIsPreCaching(false);
    setCacheProgress(null);
    return result;
  };

  // Safe Offline Mode Switch
  const handleSelectStorageMode = async (mode: 'online' | 'offline') => {
    if (mode === 'online') {
      onUpdateSettings({ imageStorageMode: 'online' });
      setOfflinePrompt(null);
      return;
    }

    // Checking cache readiness before activating Offline mode
    const status = await checkLibraryCacheStatus(mediaItems);
    if (status.isFullyCached || status.missingUrls.length === 0) {
      onUpdateSettings({ imageStorageMode: 'offline' });
      setOfflinePrompt(null);
    } else {
      setOfflinePrompt({ missingCount: status.missingUrls.length });
    }
  };

  const handlePreCacheAndActivateOffline = async () => {
    const result = await executePreCache();
    if (result && result.success) {
      onUpdateSettings({ imageStorageMode: 'offline' });
    }
  };

  // Safe Clear Cache (ensures app is in Online mode if currently offline)
  const handleClearCachedImages = async () => {
    if (settings.imageStorageMode === 'offline') {
      onUpdateSettings({ imageStorageMode: 'online' });
    }
    await clearImageCache();
    const stats = await getImageCacheStats();
    setImageCacheStats(stats);
    setPreCacheResult(null);
  };

  const handleExport = () => {
    const json = exportLibraryBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ehsaan-play-journal-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content) {
        const res = onRestoreBackup(content);
        if (typeof res === 'object' && res !== null) {
          setImportFeedback({
            success: res.success,
            message: res.success
              ? `Backup restored: ${res.restoredCounts?.mediaCount ?? 0} titles and ${res.restoredCounts?.listsCount ?? 0} lists.`
              : res.message,
          });
        } else {
          setImportFeedback({
            success: Boolean(res),
            message: res ? 'Backup restored successfully!' : 'Failed to restore backup file.',
          });
        }
        setStorageStats(getStorageStats());
        setTimeout(() => setImportFeedback(null), 5000);
      }
    };
    reader.readAsText(file);
    // Clear input value so same file can be selected again
    e.target.value = '';
  };

  const themes: { id: UserSettings['theme']; name: string; desc: string }[] = [
    {
      id: 'cream',
      name: 'Warm Cream',
      desc: 'Soft paper warm palette inspired by Tomato FOSS',
    },
    {
      id: 'dark-olive',
      name: 'Dark Olive',
      desc: 'Deep earthy cinema night mode',
    },
    {
      id: 'oled-black',
      name: 'OLED Black',
      desc: 'Pure contrast minimalist black',
    },
  ];

  return (
    <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-28 md:pb-16 text-[var(--text-primary)] transition-all duration-300 ${layoutMode === 'grid' ? 'max-w-6xl' : 'max-w-4xl'}`}>
      {/* Header with Top Right Icon-Only View Toggle */}
      <div className="flex items-start justify-between gap-4 mb-8 sm:mb-10">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
            Preferences
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-0.5 text-[var(--text-primary)]">
            Settings & Data
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Local-first storage, appearance, offline artwork, and metadata integration
          </p>
        </div>

        {/* Top-Right Icon-Only View Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] shrink-0 shadow-2xs">
          <button
            onClick={() => setLayoutMode('single')}
            aria-label="Single column view"
            title="Single column view"
            className={`p-2 rounded-xl transition-all active:scale-90 ${
              layoutMode === 'single'
                ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs font-bold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Rows className="w-4 h-4 stroke-[2.5]" />
          </button>
          <button
            onClick={() => setLayoutMode('grid')}
            aria-label="Two column grid view"
            title="Two column grid view"
            className={`p-2 rounded-xl transition-all active:scale-90 ${
              layoutMode === 'grid'
                ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs font-bold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <LayoutGrid className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      <div
        className={
          layoutMode === 'grid'
            ? 'columns-1 md:columns-2 gap-6 space-y-6'
            : 'space-y-8'
        }
      >
        {/* PWA & APP LOGO CARD */}
        <section className={`bg-[var(--bg-surface-card)] p-6 sm:p-7 rounded-3xl border border-[var(--border-subtle)] ${layoutMode === 'grid' ? 'break-inside-avoid mb-6 w-full inline-block shadow-2xs' : ''}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              {/* App Logo Emblem */}
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm flex-none overflow-hidden border border-[#4E562F]/15">
                <img src="/icon.svg" alt="EHSAAN PLAY Logo" className="w-full h-full object-cover" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-extrabold text-[var(--text-primary)]">
                    EHSAAN PLAY
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      isOnline
                        ? 'bg-[var(--accent-secondary)] text-[var(--accent-secondary-text)]'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {isOnline ? (
                      <>
                        <Wifi className="w-3 h-3" /> Online
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3 h-3 text-amber-700" /> Offline
                      </>
                    )}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-snug">
                  {isInstalled
                    ? 'Installed as standalone Progressive Web App (PWA).'
                    : 'Install to your home screen or desktop for standalone local journal experience.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
              {hasUpdate ? (
                <button
                  onClick={applyUpdate}
                  disabled={isUpdating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#4E562F] text-[#FAF8F2] text-xs font-extrabold hover:bg-[#3E4524] transition shadow-xs active:scale-95 disabled:opacity-50"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#E4EAB8]" />
                      <span>Updating PWA...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 text-[#E4EAB8]" />
                      <span>Update Ready ✦</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={checkForUpdate}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-bold transition border border-[var(--border-subtle)] active:scale-95"
                  title="Check for application shell updates"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                  <span>Check Version</span>
                </button>
              )}

              {!isInstalled && isInstallable && (
                <button
                  onClick={install}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-90 transition shadow-xs active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Install App</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* OFFLINE / ONLINE STORAGE & IMAGE CACHING */}
        <section className={`bg-[var(--bg-card-yellow)] p-6 sm:p-7 rounded-3xl shadow-sm text-[var(--text-card-yellow)] border-none ${layoutMode === 'grid' ? 'break-inside-avoid mb-6 w-full inline-block' : ''}`}>
          <div className="flex items-center justify-between gap-2.5 mb-2">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--text-card-yellow)]">
              <Database className="w-4 h-4" />
              <span>Image Storage & Offline Mode</span>
            </div>
            <span className="text-xs font-bold tabular-nums">
              Artwork Cache: <strong className="font-black">{imageCacheStats.formattedSize}</strong> ({imageCacheStats.count} files)
            </span>
          </div>

          <p className="text-xs opacity-85 leading-relaxed mb-5 font-medium">
            Choose how movie album covers and backdrop artwork are resolved on your device:
          </p>

          {/* Mode Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
            {/* Online Stream Mode */}
            <button
              type="button"
              onClick={() => handleSelectStorageMode('online')}
              className={`p-4 sm:p-5 rounded-2xl text-left transition ${
                (settings.imageStorageMode || 'online') === 'online'
                  ? 'bg-[var(--bg-primary)] shadow-md text-[var(--text-primary)]'
                  : 'bg-[var(--bg-primary)]/60 hover:bg-[var(--bg-primary)] text-[var(--text-card-yellow)]/80'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-[var(--accent-primary)]" />
                  <span className="text-sm font-black">Online Cloud Streaming</span>
                </div>
                {(settings.imageStorageMode || 'online') === 'online' && (
                  <Check className="w-4 h-4 text-[var(--accent-primary)] stroke-[3]" />
                )}
              </div>
              <p className="text-xs opacity-85 leading-relaxed">
                <strong>Low Storage (~50 KB)</strong>: Watchlists and reflections stay private on your device; high-resolution posters load on-demand over the internet.
              </p>
            </button>

            {/* Offline Mode */}
            <button
              type="button"
              onClick={() => handleSelectStorageMode('offline')}
              className={`p-4 sm:p-5 rounded-2xl text-left transition ${
                settings.imageStorageMode === 'offline'
                  ? 'bg-[var(--bg-primary)] shadow-md text-[var(--text-primary)]'
                  : 'bg-[var(--bg-primary)]/60 hover:bg-[var(--bg-primary)] text-[var(--text-card-yellow)]/80'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[var(--accent-primary)]" />
                  <span className="text-sm font-black">Offline Local Artwork</span>
                </div>
                {settings.imageStorageMode === 'offline' && (
                  <Check className="w-4 h-4 text-[var(--accent-primary)] stroke-[3]" />
                )}
              </div>
              <p className="text-xs opacity-85 leading-relaxed">
                <strong>Zero Network Required</strong>: Artwork is stored locally in Cache Storage so every shelf and preview opens without internet connection.
              </p>
            </button>
          </div>

          {/* Missing Artwork Offline Warning & Safe Transition Action */}
          {offlinePrompt && (
            <div className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-700 flex-none mt-0.5" />
                <div>
                  <strong>{offlinePrompt.missingCount} artwork files</strong> are not yet saved to local cache. Pre-cache now for a complete offline experience.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onUpdateSettings({ imageStorageMode: 'offline' });
                    setOfflinePrompt(null);
                  }}
                  className="px-3 py-1.5 rounded-full bg-amber-200/80 hover:bg-amber-200 text-amber-900 font-semibold"
                >
                  Activate Anyway
                </button>
                <button
                  onClick={handlePreCacheAndActivateOffline}
                  className="px-4 py-1.5 rounded-full bg-[#4E562F] text-[#FAF8F2] font-bold shadow-xs active:scale-95"
                >
                  Cache & Switch
                </button>
              </div>
            </div>
          )}

          {/* Action Bar for Image Cache */}
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#4E562F]/10">
            <button
              onClick={executePreCache}
              disabled={isPreCaching || mediaItems.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#4E562F] text-[#FAF8F2] text-xs font-bold hover:bg-[#3E4524] transition shadow-xs disabled:opacity-50 active:scale-95"
            >
              {isPreCaching ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    Caching artwork {cacheProgress?.done}/{cacheProgress?.total}...
                  </span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Pre-cache Library Artwork</span>
                </>
              )}
            </button>

            {imageCacheStats.count > 0 && (
              <button
                onClick={handleClearCachedImages}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FAF8F2] hover:bg-rose-50 text-rose-700 text-xs font-semibold transition border border-rose-200 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Clear Artwork Cache ({imageCacheStats.formattedSize})</span>
              </button>
            )}
          </div>

          {/* Pre-cache Outcome Summary */}
          {preCacheResult && (
            <div
              className={`mt-4 p-4 rounded-2xl text-xs flex items-start gap-2.5 animate-fade-in ${
                preCacheResult.success
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border border-rose-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-none mt-0.5" />
              <div>
                <div className="font-bold">
                  {preCacheResult.total} Total Artwork URLs Processed
                </div>
                <div className="mt-0.5 opacity-90">
                  {preCacheResult.cached} newly cached · {preCacheResult.alreadyCached} existing · {preCacheResult.failed} failed
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Appearance Section */}
        <section className={`bg-[var(--bg-surface-card)] p-6 sm:p-7 rounded-3xl border border-[var(--border-subtle)] ${layoutMode === 'grid' ? 'break-inside-avoid mb-6 w-full inline-block shadow-2xs' : ''}`}>
          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-4">
            <Palette className="w-4 h-4 text-[var(--accent-primary)]" />
            <span>Appearance & Theme</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {themes.map(t => {
              const isSelected = settings.theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onUpdateSettings({ theme: t.id })}
                  className={`p-4 rounded-2xl text-left transition ${
                    isSelected
                      ? 'bg-[var(--bg-card-yellow)] shadow-md text-[var(--text-card-yellow)]'
                      : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-black text-[var(--text-primary)]">{t.name}</span>
                    {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                  <p className="text-xs opacity-80 leading-snug">{t.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Backdrop Opacity Slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)] mb-2">
              <span>Default Backdrop Opacity</span>
              <span className="text-[var(--text-primary)] tabular-nums font-bold">
                {Math.round(settings.backdropOpacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={settings.backdropOpacity}
              onChange={e => onUpdateSettings({ backdropOpacity: Number(e.target.value) })}
              className="w-full h-2 bg-[var(--chip-bg)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
            />
          </div>
        </section>

        {/* Tweaks Section */}
        <section className={`bg-[var(--bg-surface-card)] p-6 sm:p-7 rounded-3xl border border-[var(--border-subtle)] ${layoutMode === 'grid' ? 'break-inside-avoid mb-6 w-full inline-block shadow-2xs' : ''}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              <SlidersHorizontal className="w-4 h-4 text-[var(--accent-primary)]" />
              <span>Tweaks</span>
            </div>
            <span className="text-[11px] font-bold text-[var(--accent-primary)] bg-[var(--chip-bg)] px-2.5 py-0.5 rounded-full border border-[var(--border-subtle)]">
              UI Behaviors
            </span>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-5">
            Customize navigation behaviors, scroll dynamics, and interface preferences.
          </p>

          <div className="space-y-3.5">
            {/* 1. Scroll Hide Topbar Option */}
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-extrabold text-[var(--text-primary)]">
                  Scroll Hide Topbar
                </div>
                <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug">
                  Automatically slide header out of view when scrolling down for extra canvas space.
                </div>
              </div>

              {/* Pill-shape Toggle Switch */}
              <div className="flex items-center gap-1 p-1 bg-[var(--chip-bg)] rounded-full border border-[var(--border-subtle)] shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    const currentTweaks = settings.tweaks || DEFAULT_APP_TWEAKS;
                    onUpdateSettings({
                      tweaks: {
                        ...currentTweaks,
                        autoHideHeader: true,
                      },
                    });
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all active:scale-95 ${
                    settings.tweaks?.autoHideHeader !== false
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-2xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  On
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const currentTweaks = settings.tweaks || DEFAULT_APP_TWEAKS;
                    onUpdateSettings({
                      tweaks: {
                        ...currentTweaks,
                        autoHideHeader: false,
                      },
                    });
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all active:scale-95 ${
                    settings.tweaks?.autoHideHeader === false
                      ? 'bg-rose-500 text-white shadow-2xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Off
                </button>
              </div>
            </div>

            {/* 2. Extensible Tweak: Reduced Motion */}
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 opacity-90">
              <div>
                <div className="text-xs font-bold text-[var(--text-primary)]">
                  Reduced Motion & Animations
                </div>
                <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug">
                  Minimize card hover animations and smooth layout transitions.
                </div>
              </div>

              <div className="flex items-center gap-1 p-1 bg-[var(--chip-bg)] rounded-full border border-[var(--border-subtle)] shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    const currentTweaks = settings.tweaks || DEFAULT_APP_TWEAKS;
                    onUpdateSettings({
                      tweaks: {
                        ...currentTweaks,
                        reducedMotion: true,
                      },
                    });
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all active:scale-95 ${
                    settings.tweaks?.reducedMotion === true
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-2xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  On
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const currentTweaks = settings.tweaks || DEFAULT_APP_TWEAKS;
                    onUpdateSettings({
                      tweaks: {
                        ...currentTweaks,
                        reducedMotion: false,
                      },
                    });
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all active:scale-95 ${
                    !settings.tweaks?.reducedMotion
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-2xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Off
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Home Shelves & Explore Recommendations Section */}
        <section className={`bg-[var(--bg-surface-card)] p-6 sm:p-7 rounded-3xl border border-[var(--border-subtle)] ${layoutMode === 'grid' ? 'break-inside-avoid mb-6 w-full inline-block shadow-2xs' : ''}`}>
          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
            <LayoutGrid className="w-4 h-4 text-[var(--accent-primary)]" />
            <span>Home Shelves & Discover Section</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
            Toggle which dynamic narrative shelves appear on your cinema home page:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              { key: 'showContinueWatching', label: 'Continue Watching', desc: 'In-progress episodes and films' },
              { key: 'showTopMovies', label: 'Top 10 Movies', desc: 'Highest rated feature films' },
              { key: 'showTopSeries', label: 'Top 10 Series', desc: 'Acclaimed television series' },
              { key: 'showFavorites', label: 'Personal Favorites', desc: 'Titles marked as favorite' },
              { key: 'showRecentlyWatched', label: 'Recently Watched', desc: 'Completed viewing log' },
              { key: 'showExplore', label: 'Explore Recommendations', desc: '50+ TMDB titles not in watchlist' },
            ].map(({ key, label, desc }) => {
              const currentSections = settings.homeSections || {
                showTopMovies: true,
                showTopSeries: true,
                showContinueWatching: true,
                showFavorites: true,
                showRecentlyWatched: true,
                showExplore: true,
              };
              const active = currentSections[key as keyof typeof currentSections] !== false;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onUpdateSettings({
                      homeSections: {
                        ...currentSections,
                        [key]: !active,
                      },
                    });
                  }}
                  className={`p-3.5 rounded-2xl text-left transition flex items-center justify-between gap-3 ${
                    active
                      ? 'bg-[var(--bg-card-yellow)] shadow-md text-[var(--text-card-yellow)]'
                      : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold">{label}</div>
                    <div className="text-[11px] opacity-80 truncate mt-0.5">{desc}</div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition ${
                      active ? 'bg-[#3A2C10] text-[#FED898]' : 'bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {active ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* TMDB API Integration & Diagnostic */}
        <section className={`bg-[var(--bg-surface-card)] p-6 sm:p-7 rounded-3xl border border-[var(--border-subtle)] ${layoutMode === 'grid' ? 'break-inside-avoid mb-6 w-full inline-block shadow-2xs' : ''}`}>
          <div className="flex items-center justify-between gap-2.5 mb-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              <Key className="w-4 h-4 text-[var(--accent-primary)]" />
              <span>TMDB Metadata Integration</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-secondary)] text-[var(--accent-secondary-text)] text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              {settings.tmdbApiKey?.trim() ? 'Custom Key Active' : 'System Key Active'}
            </span>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
            Live metadata and multi-search are active. You can run an instant diagnostic or provide a custom key below.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              type="password"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              placeholder={settings.tmdbApiKey ? '••••••••••••••••••••••••' : 'System key active (or enter custom key)'}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-[var(--modal-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] border border-[var(--border-subtle)] font-mono"
            />
            <button
              onClick={() => {
                onUpdateSettings({ tmdbApiKey: apiKeyInput.trim() || undefined });
                setApiKeyInput(apiKeyInput.trim());
              }}
              className="px-5 py-2.5 rounded-2xl bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-90 transition shrink-0"
            >
              Save Key
            </button>
            {settings.tmdbApiKey && (
              <button
                onClick={() => {
                  onUpdateSettings({ tmdbApiKey: undefined });
                  setApiKeyInput('');
                }}
                className="px-4 py-2.5 rounded-2xl bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold transition shrink-0"
              >
                Reset Default
              </button>
            )}
          </div>

          {/* Diagnostic Runner Button & Result Card */}
          <div className="pt-3 border-t border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">API Health & Diagnostic</span>
              <button
                onClick={handleRunDiagnostic}
                disabled={isRunningDiagnostic}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[var(--chip-bg)] hover:opacity-90 text-[var(--accent-primary)] text-xs font-bold transition disabled:opacity-50 active:scale-95"
              >
                {isRunningDiagnostic ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <Activity className="w-3.5 h-3.5" />
                    <span>Run API Diagnostic</span>
                  </>
                )}
              </button>
            </div>

            {diagnosticResult && (
              <div
                className={`mt-3 p-4 rounded-2xl text-xs flex items-start gap-3 animate-fade-in ${
                  diagnosticResult.success
                    ? 'bg-emerald-900/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-900/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {diagnosticResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-none mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-none mt-0.5" />
                )}
                <div>
                  <div className="font-bold flex items-center gap-2">
                    <span>{diagnosticResult.success ? 'Diagnostic Passed' : 'Diagnostic Alert'}</span>
                    <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-black/20">
                      {diagnosticResult.latencyMs} ms
                    </span>
                  </div>
                  <p className="mt-1 opacity-90 leading-relaxed">
                    {diagnosticResult.message}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Custom Keyboard Shortcuts Section */}
        <section className={`bg-[var(--bg-surface-card)] p-6 sm:p-7 rounded-3xl border border-[var(--border-subtle)] ${layoutMode === 'grid' ? 'break-inside-avoid mb-6 w-full inline-block shadow-2xs' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              <Keyboard className="w-4 h-4 text-[var(--accent-primary)]" />
              <span>Custom Keyboard Shortcuts</span>
            </div>
            <button
              onClick={() => onUpdateSettings({ keyboardShortcuts: DEFAULT_KEYBOARD_SHORTCUTS })}
              className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
            >
              Reset Defaults
            </button>
          </div>

          <p className="text-xs text-[var(--text-secondary)] mb-5 leading-relaxed">
            Assign custom single-key or modifier shortcuts to navigate EHSAAN PLAY effortlessly without relying on mouse clicks.
          </p>

          <div className="space-y-2.5">
            {[
              { key: 'goBack' as const, label: 'Back / Close Action', desc: 'Close preview, search, or navigate back' },
              { key: 'goHome' as const, label: 'Home Page', desc: 'Jump directly to Home library screen' },
              { key: 'goWatchlist' as const, label: 'Watchlist Page', desc: 'Open your Watchlist & journal' },
              { key: 'openSearch' as const, label: 'Search Modal', desc: 'Open global search modal' },
              { key: 'goLists' as const, label: 'Custom Lists Page', desc: 'Open your collections & custom lists' },
            ].map(item => {
              const currentKey = shortcuts[item.key] || DEFAULT_KEYBOARD_SHORTCUTS[item.key];
              const isRecording = recordingAction === item.key;

              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] transition"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="text-xs font-bold text-[var(--text-primary)] truncate">
                      {item.label}
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] truncate">
                      {item.desc}
                    </div>
                  </div>

                  <button
                    onClick={() => setRecordingAction(isRecording ? null : item.key)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-2xs active:scale-95 ${
                      isRecording
                        ? 'bg-amber-500 text-white animate-pulse'
                        : 'bg-[var(--chip-bg)] text-[var(--text-primary)] hover:bg-[var(--accent-primary)] hover:text-[var(--bg-primary)] border border-[var(--border-subtle)]'
                    }`}
                  >
                    {isRecording ? (
                      <span>Press any key...</span>
                    ) : (
                      <>
                        <kbd className="font-mono uppercase font-black tracking-wider">
                          {currentKey === 'Escape' ? 'Esc' : currentKey}
                        </kbd>
                        <span className="text-[10px] opacity-70">Change</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Data & Storage Section */}
        <section className={`bg-[var(--bg-surface-card)] p-6 sm:p-7 rounded-3xl border border-[var(--border-subtle)] ${layoutMode === 'grid' ? 'break-inside-avoid mb-6 w-full inline-block shadow-2xs' : ''}`}>
          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-4">
            <HardDrive className="w-4 h-4 text-[var(--accent-primary)]" />
            <span>Local Storage & Backup</span>
          </div>

          {/* Metrics summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--bg-card-yellow)] p-4 rounded-2xl mb-6 border-none shadow-2xs text-[var(--text-card-yellow)]">
            <div>
              <div className="text-[11px] font-bold opacity-85 uppercase tracking-wider">Journal Storage</div>
              <div className="text-lg font-black tabular-nums mt-0.5">
                ~{storageStats.usedKb} KB
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold opacity-85 uppercase tracking-wider">Cached Titles</div>
              <div className="text-lg font-black tabular-nums mt-0.5">
                {storageStats.totalItems}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold opacity-85 uppercase tracking-wider">Watchlist</div>
              <div className="text-lg font-black tabular-nums mt-0.5">
                {storageStats.watchlistCount}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold opacity-85 uppercase tracking-wider">Custom Lists</div>
              <div className="text-lg font-black tabular-nums mt-0.5">
                {storageStats.listsCount}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-90 transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Backup JSON</span>
            </button>

            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--chip-bg)] hover:opacity-90 text-[var(--text-primary)] text-xs font-bold transition cursor-pointer border border-[var(--border-subtle)]">
              <Upload className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>Restore Backup</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Delete All Button */}
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete all saved items, watchlists, ratings, notes, and playlists? This cannot be undone.')) {
                  onDeleteAllData();
                  setStorageStats(getStorageStats());
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 text-xs font-bold transition border border-rose-500/20 active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Delete All Data</span>
            </button>
          </div>

          {copySuccess && (
            <p className="mt-3 text-xs font-semibold text-emerald-400 animate-fade-in">
              Backup file successfully generated and downloaded!
            </p>
          )}

          {importFeedback && (
            <p
              className={`mt-3 text-xs font-semibold animate-fade-in ${
                importFeedback.success ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {importFeedback.message}
            </p>
          )}
        </section>

        {/* About & Tribute */}
        <section className={`bg-[var(--bg-surface-card)] p-6 sm:p-7 rounded-3xl border border-[var(--border-subtle)] text-center sm:text-left ${layoutMode === 'grid' ? 'break-inside-avoid mb-6 w-full inline-block shadow-2xs' : ''}`}>
          <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-bold uppercase tracking-widest text-[var(--accent-primary)] mb-2">
            <Sparkles className="w-4 h-4" />
            <span>EHSAAN PLAY</span>
          </div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)]">
            A Personal Cinema Journal
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed max-w-xl">
            Designed with extreme minimalism, calm typography, and zero commercial noise.
            Created for cinephiles who value a distraction-free media space.
          </p>

          {/* Cute Dark Green Pill Showcase & Support */}
          <div className="mt-5 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
            <a
              href="https://ehsaan.odoo.com/support"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#4E562F] hover:bg-[#3E4524] text-[#FAF8F2] text-xs font-bold transition shadow-xs active:scale-95 group"
            >
              <Coffee className="w-3.5 h-3.5 text-[#E4EAB8] group-hover:rotate-12 transition-transform" />
              <span>Support Project</span>
              <ExternalLink className="w-3 h-3 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>

            <a
              href="https://github.com/ehsaanullah/ehsaanplay"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E4EAB8] hover:bg-[#D8E0A3] text-[#3B421E] text-xs font-bold transition shadow-xs active:scale-95 group border border-[#4E562F]/20"
            >
              <Github className="w-3.5 h-3.5 group-hover:scale-110 transition-transform text-[#3B421E]" />
              <span>github.com/ehsaanullah/ehsaanplay</span>
              <ExternalLink className="w-3 h-3 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>

            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[var(--chip-bg)] text-[var(--text-primary)] text-xs font-bold border border-[var(--border-subtle)]">
              <Code2 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>Open Source</span>
            </span>
          </div>

          <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-center sm:justify-start gap-3 text-xs text-[var(--text-secondary)]">
            <span>Version 2.4.0</span>
            <span aria-hidden="true">·</span>
            <span>Local-First PWA</span>
            <span aria-hidden="true">·</span>
            <span>MIT License</span>
          </div>
        </section>
      </div>
    </div>
  );
};
