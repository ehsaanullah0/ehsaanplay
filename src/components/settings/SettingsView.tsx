import React, { useState, useEffect, useCallback } from 'react';
import {
  UserSettings,
  MediaItem,
  DEFAULT_KEYBOARD_SHORTCUTS,
  KeyboardShortcutsConfig,
  DEFAULT_APP_TWEAKS,
  AppFontFamily,
} from '../../types/movie';
import {
  exportLibraryBackup,
  getStorageStats,
  StorageStats,
  ImportResult,
  DEFAULT_HOME_SECTIONS,
} from '../../services/storage';
import {
  getImageCacheStats,
  preCacheLibraryImages,
  clearImageCache,
  checkLibraryCacheStatus,
  ImageCacheStats,
  PreCacheResult,
} from '../../services/imageStorage';
import { testTMDBConnection, DiagnosticResult, getCuratedExploreMediaItems } from '../../services/tmdb';
import { usePWAInstall, useOnlineStatus, usePWAUpdate } from '../../hooks/usePWAInstall';
import { useFullscreen } from '../../hooks/useFullscreen';
import { CHANGELOG_VERSIONS } from '../../data/changelogData';
import { DeviceTransferView } from './DeviceTransferView';
import {
  Palette,
  HardDrive,
  Download,
  Upload,
  Sparkles,
  Key,
  Check,
  X,
  Smartphone,
  CheckCircle2,
  Database,
  RefreshCw,
  Info,
  Github,
  ExternalLink,
  Code2,
  Keyboard,
  Coffee,
  SlidersHorizontal,
  History,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  GitCommit,
  Type,
  Sun,
  Contrast,
  Sliders,
  Eye,
  Heart,
  Bookmark,
  CheckSquare,
  PlusCircle,
  Globe,
  Mail,
  Maximize2,
  Minimize2,
  Lightbulb,
  MousePointerClick,
  ArrowLeftRight,
  Pencil,
  RotateCcw,
  QrCode,
  Wifi,
  Compass,
} from 'lucide-react';

export type SettingsTopicId =
  | 'app'
  | 'device-transfer'
  | 'appearance'
  | 'tweaks'
  | 'tips'
  | 'storage'
  | 'tmdb'
  | 'shortcuts'
  | 'backup'
  | 'about';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  onDeleteAllData: () => void;
  onRestoreBackup: (json: string) => ImportResult | boolean;
  mediaItems?: MediaItem[];
  initialTopic?: SettingsTopicId | null;
  onRefreshData?: () => void;
  onClearCachedTitlesAndImages?: () => Promise<boolean | void> | void;
  onReplayGuide?: () => void;
}

/**
 * Material 3 Tactile Switch Component
 * Matches the visual design in the reference screenshots with sliding checkmark/cross knob.
 */
interface M3SwitchProps {
  checked: boolean;
  onChange: () => void;
  ariaLabel?: string;
  disabled?: boolean;
}

const M3Switch: React.FC<M3SwitchProps> = ({ checked, onChange, ariaLabel, disabled = false }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
        checked
          ? 'bg-[var(--accent-primary)]'
          : 'bg-[var(--chip-bg)] border border-[var(--border-subtle)]'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
    >
      <span
        className={`pointer-events-none flex h-5 w-5 transform items-center justify-center rounded-full shadow-2xs transition duration-200 ease-in-out my-auto ${
          checked
            ? 'translate-x-6 bg-[var(--bg-primary)] text-[var(--accent-primary)] font-bold'
            : 'translate-x-1 bg-[var(--text-secondary)]/45 text-white'
        }`}
      >
        {checked ? (
          <Check className="w-3 h-3 stroke-[3]" />
        ) : (
          <X className="w-2.5 h-2.5 stroke-[2.5]" />
        )}
      </span>
    </button>
  );
};

/**
 * Material 3 Expressive Tactile Slider Component
 * Matches the visual style from the reference screenshot with thick track, vertical line thumb, and end-stop dot.
 */
interface M3SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  ariaLabel?: string;
}

const M3Slider: React.FC<M3SliderProps> = ({
  value,
  min,
  max,
  step = 0.05,
  onChange,
  ariaLabel,
}) => {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return (
    <div className="relative w-full py-2 flex items-center select-none">
      {/* Thick M3 Tactile Track */}
      <div className="relative w-full h-3.5 rounded-full flex items-center overflow-hidden bg-[var(--chip-bg)] border border-[var(--border-subtle)]">
        {/* Active Track */}
        <div
          className="h-full bg-[var(--accent-primary)] transition-all duration-75 rounded-l-full"
          style={{ width: `${percentage}%` }}
        />
        {/* Inactive Track */}
        <div className="h-full flex-1 bg-[var(--chip-bg)] relative">
          {/* Subtle End Stop Dot */}
          <span className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)]/35" />
        </div>
      </div>

      {/* M3 Vertical Pill Line Thumb */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none transition-all duration-75 flex items-center justify-center z-10"
        style={{ left: `${percentage}%` }}
      >
        <div className="w-1.5 h-6 rounded-full bg-[var(--accent-primary)] shadow-sm ring-2 ring-[var(--bg-primary)]" />
      </div>

      {/* Invisible Native Input for 100% Touch & Mouse Dragging + Accessibility */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        aria-label={ariaLabel}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
      />
    </div>
  );
};

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onDeleteAllData,
  onRestoreBackup,
  mediaItems = [],
  initialTopic,
  onRefreshData,
  onClearCachedTitlesAndImages,
  onReplayGuide,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const { hasUpdate, isUpdating, isChecking, checkMessage, applyUpdate, checkForUpdate } = usePWAUpdate();
  const isOnline = useOnlineStatus();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [storageStats, setStorageStats] = useState<StorageStats>(getStorageStats());
  const [imageCacheStats, setImageCacheStats] = useState<ImageCacheStats>({ count: 0, bytes: 0, formattedSize: '0 KB' });
  const [apiKeyInput, setApiKeyInput] = useState(settings.tmdbApiKey || '');
  const [importFeedback, setImportFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // State for older versions expand/collapse in EHSAAN PLAY section
  const [isOlderVersionsExpanded, setIsOlderVersionsExpanded] = useState(false);

  // Selected topic: on desktop default to 'app', on mobile null means topic hub menu
  const [selectedTopic, setSelectedTopic] = useState<SettingsTopicId | null>(() => {
    if (initialTopic !== undefined && initialTopic !== null) {
      return initialTopic;
    }
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return null;
    }
    return 'app';
  });

  useEffect(() => {
    if (initialTopic !== undefined && initialTopic !== null) {
      setSelectedTopic(initialTopic);
    }
  }, [initialTopic]);

  const handleSelectTopic = (topicId: SettingsTopicId | null) => {
    setSelectedTopic(topicId);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Diagnostic state
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);

  // Pre-cache state & results
  const [isPreCaching, setIsPreCaching] = useState(false);
  const [preCacheResult, setPreCacheResult] = useState<PreCacheResult | null>(null);

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

  const getAllOfflineCandidateItems = useCallback(() => {
    const combined = [
      ...mediaItems,
      ...getCuratedExploreMediaItems(),
    ];
    const unique = new Map<string, MediaItem>();
    for (const item of combined) {
      if (item && item.id && !unique.has(item.id)) {
        unique.set(item.id, item);
      }
    }
    return Array.from(unique.values());
  }, [mediaItems]);

  const executePreCache = async () => {
    const candidates = getAllOfflineCandidateItems();
    if (candidates.length === 0) return;
    setIsPreCaching(true);
    setPreCacheResult(null);
    setOfflinePrompt(null);

    const result = await preCacheLibraryImages(candidates, () => {});

    const stats = await getImageCacheStats();
    setImageCacheStats(stats);
    setPreCacheResult(result);
    setIsPreCaching(false);
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
    const candidates = getAllOfflineCandidateItems();
    const status = await checkLibraryCacheStatus(candidates);
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

  // Safe Clear Cache
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
    e.target.value = '';
  };

  // Color schemes list (Default Olive, Orange, Blue, Pink, Purple, and Mint in horizontal scrollable rail)
  const colorSchemes = [
    { id: 'olive', name: 'Default', color: '#4E562F', secondaryColor: '#E4EAB8' },
    { id: 'orange', name: 'Orange', color: '#FFB084', secondaryColor: '#F4DF77' },
    { id: 'blue', name: 'Blue', color: '#ADC8FA', secondaryColor: '#DCC6FA' },
    { id: 'pink', name: 'Pink', color: '#EE91A0', secondaryColor: '#F2D3F5' },
    { id: 'purple', name: 'Purple', color: '#D7C5F9', secondaryColor: '#F8BBD0' },
    { id: 'mint', name: 'Mint', color: '#13635B', secondaryColor: '#7F1D1D' },
  ];

  // Font options for Tweaks
  const fontOptions: { id: AppFontFamily; name: string; subtitle: string }[] = [
    {
      id: 'default',
      name: 'Default',
      subtitle: 'Plus Jakarta Sans',
    },
    {
      id: 'google-sans-flex',
      name: 'Google Sans Flex',
      subtitle: 'Material 3 Variable',
    },
  ];

  // List of all Settings Topics
  const topics: {
    id: SettingsTopicId;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'app',
      title: 'EHSAAN PLAY',
      subtitle: `Version ${CHANGELOG_VERSIONS[0]?.version || 'v3.0.0'} · ${isInstalled ? 'Installed PWA' : isOnline ? 'Online Ready' : 'Offline Mode'}`,
      icon: <Smartphone className="w-5 h-5 text-[var(--accent-primary)]" />,
    },
    {
      id: 'device-transfer',
      title: 'Device Transfer',
      subtitle: 'Same-Wi-Fi direct sync · Send or receive recent changes',
      icon: <Wifi className="w-5 h-5 text-[var(--accent-primary)]" />,
    },
    {
      id: 'appearance',
      title: 'Appearance',
      subtitle: `Theme: ${settings.theme === 'dark-olive' ? 'Dark' : settings.theme === 'oled-black' ? 'OLED Black' : 'Warm Cream'} · Color: ${colorSchemes.find(s => s.id === (settings.colorScheme || 'olive'))?.name || 'Default'}`,
      icon: <Palette className="w-5 h-5 text-[var(--accent-primary)]" />,
    },
    {
      id: 'tweaks',
      title: 'Tweaks & Shelves',
      subtitle: `Font: ${settings.tweaks?.fontFamily === 'google-sans-flex' ? 'Google Sans Flex' : 'Default'} · Shelves & Gestures`,
      icon: <SlidersHorizontal className="w-5 h-5 text-[var(--accent-primary)]" />,
    },
    {
      id: 'tips',
      title: 'Tips & Tricks',
      subtitle: 'Long-press gestures, shelf editing & power shortcuts',
      icon: <Lightbulb className="w-5 h-5 text-[var(--accent-primary)]" />,
    },
    {
      id: 'storage',
      title: 'Storage & Offline',
      subtitle: `${settings.imageStorageMode === 'offline' ? 'Offline Local Artwork' : 'Online Cloud Stream'} · ${imageCacheStats.formattedSize}`,
      icon: <Database className="w-5 h-5 text-[var(--accent-primary)]" />,
    },
    {
      id: 'tmdb',
      title: 'TMDB API & Diagnostics',
      subtitle: `${settings.tmdbApiKey ? 'Custom Key Active' : 'Public System Key'} · Health Monitor`,
      icon: <Key className="w-5 h-5 text-[var(--accent-primary)]" />,
    },
    {
      id: 'shortcuts',
      title: 'Keyboard Shortcuts',
      subtitle: `Back: ${shortcuts.goBack}, Home: ${shortcuts.goHome}, Search: ${shortcuts.openSearch}`,
      icon: <Keyboard className="w-5 h-5 text-[var(--accent-primary)]" />,
    },
    {
      id: 'backup',
      title: 'Backup & Restore',
      subtitle: `Journal: ~${storageStats.usedKb} KB · Titles: ${storageStats.totalItems} · Lists: ${storageStats.listsCount}`,
      icon: <HardDrive className="w-5 h-5 text-[var(--accent-primary)]" />,
    },
    {
      id: 'about',
      title: 'About',
      subtitle: `EHSAAN PLAY ${CHANGELOG_VERSIONS[0]?.version || 'v3.0.0'} · Ecosystem · Open Source · Support`,
      icon: <Info className="w-5 h-5 text-[var(--accent-primary)]" />,
    },
  ];

  // Active topic object for desktop / sub-page view
  const currentTopic = topics.find(t => t.id === selectedTopic) || topics[0];

  // Render Inner Content for a Selected Topic (Material 3 Clean Minimal Grouped Layout)
  const renderTopicContent = (topicId: SettingsTopicId) => {
    switch (topicId) {
      case 'device-transfer':
        return <DeviceTransferView onRefreshData={onRefreshData} />;

      case 'appearance':
        return (
          <div className="space-y-4">
            {/* Card Group 1: Theme & Color Palette */}
            <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xs divide-y divide-[var(--border-subtle)] overflow-hidden">
              {/* Theme Segmented Bubble Selector */}
              <div className="p-4 sm:p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Sun className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />
                  <div className="font-bold text-sm text-[var(--text-primary)]">Theme</div>
                </div>

                {/* Pill Bubbles */}
                <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)]">
                  {[
                    { id: 'cream' as const, label: 'Warm Cream' },
                    { id: 'dark-olive' as const, label: 'Dark Olive' },
                    { id: 'oled-black' as const, label: 'OLED Black' },
                  ].map(t => {
                    const isActive = settings.theme === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onUpdateSettings({ theme: t.id })}
                        className={`py-2 px-2 sm:px-3 rounded-xl text-xs font-bold transition-all text-center truncate active:scale-95 ${
                          isActive
                            ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Scheme Palette Row (Matching Screenshot 1) */}
              <div className="p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Palette className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />
                  <div>
                    <div className="font-bold text-sm text-[var(--text-primary)]">Color scheme</div>
                    <div className="text-xs text-[var(--text-secondary)] font-medium">
                      {colorSchemes.find(s => s.id === (settings.colorScheme || 'olive'))?.name || 'Default'}
                    </div>
                  </div>
                </div>

                {/* Swatch Squircle Rail (Full-width 6-color palette matching Material 3 themes) */}
                <div className="grid grid-cols-6 gap-2 sm:gap-2.5 w-full py-1">
                  {colorSchemes.map(scheme => {
                    const isSelected =
                      (settings.colorScheme || 'olive') === scheme.id ||
                      (scheme.id === 'olive' && (settings.colorScheme === 'default' || !settings.colorScheme));
                    return (
                      <button
                        key={scheme.id}
                        type="button"
                        onClick={() => onUpdateSettings({ colorScheme: scheme.id })}
                        aria-label={`Select ${scheme.name} color scheme`}
                        style={{ backgroundColor: scheme.color }}
                        className={`relative w-full h-11 rounded-2xl shrink-0 transition-all flex items-center justify-center shadow-xs active:scale-95 border ${
                          isSelected
                            ? 'border-2 border-[var(--accent-primary)] scale-105 shadow-md'
                            : 'border-black/10 hover:scale-102 opacity-90 hover:opacity-100'
                        }`}
                      >
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] flex items-center justify-center shadow-2xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Backdrop Opacity Slider Row (Matching Screenshot 2) */}
              <div className="p-4 sm:p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sliders className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />
                    <div>
                      <div className="font-bold text-sm text-[var(--text-primary)]">Backdrop opacity</div>
                      <div className="text-xs text-[var(--text-secondary)]">Glass overlay density</div>
                    </div>
                  </div>
                  <span className="text-sm font-extrabold text-[var(--text-primary)] tabular-nums font-mono">
                    {Math.round((settings.backdropOpacity ?? 0.8) * 100)}%
                  </span>
                </div>

                <M3Slider
                  min={0.2}
                  max={1.0}
                  step={0.05}
                  value={settings.backdropOpacity ?? 0.8}
                  onChange={val => onUpdateSettings({ backdropOpacity: val })}
                  ariaLabel="Backdrop opacity"
                />
              </div>

              {/* Pure Black Dark Theme Toggle */}
              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div className="flex items-center gap-3 pr-3">
                  <Contrast className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />
                  <div>
                    <div className="font-bold text-sm text-[var(--text-primary)]">Black theme</div>
                    <div className="text-xs text-[var(--text-secondary)]">Pure #000000 black for OLED screens</div>
                  </div>
                </div>
                <M3Switch
                  checked={settings.theme === 'oled-black'}
                  onChange={() =>
                    onUpdateSettings({
                      theme: settings.theme === 'oled-black' ? 'dark-olive' : 'oled-black',
                    })
                  }
                  ariaLabel="Toggle pure black OLED theme"
                />
              </div>
            </div>

            {/* Card Group 2: Preview & Hero Layout */}
            <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xs divide-y divide-[var(--border-subtle)] overflow-hidden">
              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div className="flex items-center gap-3 pr-3">
                  <Eye className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />
                  <div>
                    <div className="font-bold text-sm text-[var(--text-primary)]">Preview button style</div>
                    <div className="text-xs text-[var(--text-secondary)]">Display mode for hero action buttons</div>
                  </div>
                </div>

                {/* Bubble toggle: Full Labels vs Icon Only */}
                <div className="flex p-1 rounded-xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] shrink-0">
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ previewButtonFormat: 'full' })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition active:scale-95 ${
                      settings.previewButtonFormat !== 'icon-only'
                        ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-2xs'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    Full
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ previewButtonFormat: 'icon-only' })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition active:scale-95 ${
                      settings.previewButtonFormat === 'icon-only'
                        ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-2xs'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    Icons
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'tweaks':
        return (
          <div className="space-y-4">
            {/* Card Group 1: Typography (Font Family) */}
            <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xs divide-y divide-[var(--border-subtle)] overflow-hidden">
              <div className="p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Type className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />
                  <div>
                    <div className="font-bold text-sm text-[var(--text-primary)]">Typography</div>
                    <div className="text-xs text-[var(--text-secondary)]">Select app-wide font family</div>
                  </div>
                </div>

                {/* Font Bubbles */}
                <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)]">
                  {fontOptions.map(font => {
                    const isSelected = (settings.tweaks?.fontFamily || 'google-sans-flex') === font.id;
                    return (
                      <button
                        key={font.id}
                        type="button"
                        onClick={() =>
                          onUpdateSettings({
                            tweaks: {
                              ...DEFAULT_APP_TWEAKS,
                              ...settings.tweaks,
                              fontFamily: font.id,
                            },
                          })
                        }
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-center truncate active:scale-95 ${
                          isSelected
                            ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {font.name}
                      </button>
                    );
                  })}
                </div>

                {/* Coming More Hint */}
                <div className="flex items-center gap-2 pt-1 text-[11px] text-[var(--text-secondary)]">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                  <span>More typefaces coming: Cabinet Grotesk, Inter Tight, Satoshi, Literata</span>
                </div>
              </div>
            </div>

            {/* Card Group 2: Navigation & Gestures (M3 Switch Rows) */}
            <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xs divide-y divide-[var(--border-subtle)] overflow-hidden">
              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div className="pr-3">
                  <div className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                    <span>Force Fullscreen OS Mode</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      isFullscreen
                        ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                        : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                    }`}>
                      {isFullscreen ? 'Active' : 'Exited'}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Bypass browser navigation bars and expand UI to fill complete screen area
                  </div>
                </div>
                <M3Switch
                  checked={isFullscreen}
                  onChange={toggleFullscreen}
                  ariaLabel="Toggle Force Fullscreen OS Mode"
                />
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div className="pr-3">
                  <div className="font-bold text-sm text-[var(--text-primary)]">Auto-hide topbar</div>
                  <div className="text-xs text-[var(--text-secondary)]">Hide header on scroll down to maximize screen area</div>
                </div>
                <M3Switch
                  checked={settings.tweaks?.autoHideHeader !== false}
                  onChange={() =>
                    onUpdateSettings({
                      tweaks: {
                        ...DEFAULT_APP_TWEAKS,
                        ...settings.tweaks,
                        autoHideHeader: settings.tweaks?.autoHideHeader === false,
                      },
                    })
                  }
                  ariaLabel="Toggle auto-hide topbar"
                />
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div className="pr-3">
                  <div className="font-bold text-sm text-[var(--text-primary)]">Exchange Search & Lists</div>
                  <div className="text-xs text-[var(--text-secondary)]">Move Search to bottom navigation and Lists to top corner (or long-press Search/Lists)</div>
                </div>
                <M3Switch
                  checked={Boolean(settings.swapSearchAndLists || settings.tweaks?.swapSearchAndLists)}
                  onChange={() => {
                    const nextVal = !Boolean(settings.swapSearchAndLists || settings.tweaks?.swapSearchAndLists);
                    onUpdateSettings({
                      swapSearchAndLists: nextVal,
                      tweaks: {
                        ...DEFAULT_APP_TWEAKS,
                        ...settings.tweaks,
                        swapSearchAndLists: nextVal,
                      },
                    });
                  }}
                  ariaLabel="Toggle Exchange Search and Lists positions"
                />
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div className="pr-3">
                  <div className="font-bold text-sm text-[var(--text-primary)]">Smooth scrolling</div>
                  <div className="text-xs text-[var(--text-secondary)]">Fluid momentum scrolling across rails and carousels</div>
                </div>
                <M3Switch
                  checked={settings.tweaks?.smoothScrolling !== false}
                  onChange={() =>
                    onUpdateSettings({
                      tweaks: {
                        ...DEFAULT_APP_TWEAKS,
                        ...settings.tweaks,
                        smoothScrolling: settings.tweaks?.smoothScrolling === false,
                      },
                    })
                  }
                  ariaLabel="Toggle smooth scrolling"
                />
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div className="pr-3">
                  <div className="font-bold text-sm text-[var(--text-primary)]">Haptic & micro-animations</div>
                  <div className="text-xs text-[var(--text-secondary)]">Subtle tactile motion on buttons and tabs</div>
                </div>
                <M3Switch
                  checked={settings.tweaks?.microAnimations !== false}
                  onChange={() =>
                    onUpdateSettings({
                      tweaks: {
                        ...DEFAULT_APP_TWEAKS,
                        ...settings.tweaks,
                        microAnimations: settings.tweaks?.microAnimations === false,
                      },
                    })
                  }
                  ariaLabel="Toggle micro-animations"
                />
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div className="pr-3">
                  <div className="font-bold text-sm text-[var(--text-primary)]">Long press for Watchlist Batch Selection</div>
                  <div className="text-xs text-[var(--text-secondary)]">When enabled, long-pressing on a watchlist item initiates multi-select/batch actions instead of the action popup</div>
                </div>
                <M3Switch
                  checked={Boolean(settings.tweaks?.longPressBatchSelection)}
                  onChange={() =>
                    onUpdateSettings({
                      tweaks: {
                        ...DEFAULT_APP_TWEAKS,
                        ...settings.tweaks,
                        longPressBatchSelection: !settings.tweaks?.longPressBatchSelection,
                      },
                    })
                  }
                  ariaLabel="Toggle Long Press Watchlist Batch Selection"
                />
              </div>
            </div>

            {/* Card Group 3: Home Shelves Visibility */}
            <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xs divide-y divide-[var(--border-subtle)] overflow-hidden">
              <div className="px-4 sm:px-5 py-3 bg-[var(--chip-bg)]/40 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Home Shelves & Rails
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div className="font-bold text-sm text-[var(--text-primary)]">Featured Hero Slideshow</div>
                <M3Switch
                  checked={settings.homeSections?.showHeroSlideshow === true}
                  onChange={() =>
                    onUpdateSettings({
                      homeSections: {
                        ...DEFAULT_HOME_SECTIONS,
                        ...settings.homeSections,
                        showHeroSlideshow: settings.homeSections?.showHeroSlideshow !== true,
                      },
                    })
                  }
                  ariaLabel="Toggle Featured Hero Slideshow"
                />
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div className="font-bold text-sm text-[var(--text-primary)]">Explore Recommendations</div>
                <M3Switch
                  checked={settings.tweaks?.showExploreShelf !== false}
                  onChange={() =>
                    onUpdateSettings({
                      tweaks: {
                        ...DEFAULT_APP_TWEAKS,
                        ...settings.tweaks,
                        showExploreShelf: settings.tweaks?.showExploreShelf === false,
                      },
                    })
                  }
                  ariaLabel="Toggle Explore shelf"
                />
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div className="font-bold text-sm text-[var(--text-primary)]">Continue Watching Rail</div>
                <M3Switch
                  checked={settings.tweaks?.showContinueWatching !== false}
                  onChange={() =>
                    onUpdateSettings({
                      tweaks: {
                        ...DEFAULT_APP_TWEAKS,
                        ...settings.tweaks,
                        showContinueWatching: settings.tweaks?.showContinueWatching === false,
                      },
                    })
                  }
                  ariaLabel="Toggle Continue Watching rail"
                />
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div className="font-bold text-sm text-[var(--text-primary)]">Top 10 Movies Rail</div>
                <M3Switch
                  checked={settings.tweaks?.showTop10Movies !== false}
                  onChange={() =>
                    onUpdateSettings({
                      tweaks: {
                        ...DEFAULT_APP_TWEAKS,
                        ...settings.tweaks,
                        showTop10Movies: settings.tweaks?.showTop10Movies === false,
                      },
                    })
                  }
                  ariaLabel="Toggle Top 10 Movies rail"
                />
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div className="font-bold text-sm text-[var(--text-primary)]">Top 10 Series Rail</div>
                <M3Switch
                  checked={settings.tweaks?.showTop10Series !== false}
                  onChange={() =>
                    onUpdateSettings({
                      tweaks: {
                        ...DEFAULT_APP_TWEAKS,
                        ...settings.tweaks,
                        showTop10Series: settings.tweaks?.showTop10Series === false,
                      },
                    })
                  }
                  ariaLabel="Toggle Top 10 Series rail"
                />
              </div>
            </div>

            {/* Card Group 4: Preview Action Buttons */}
            <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xs divide-y divide-[var(--border-subtle)] overflow-hidden">
              <div className="px-4 sm:px-5 py-3 bg-[var(--chip-bg)]/40 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Preview Modal Action Buttons
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5 font-bold text-sm text-[var(--text-primary)]">
                  <Heart className="w-4 h-4 text-[var(--accent-primary)]" />
                  <span>Favorite Button</span>
                </div>
                <M3Switch
                  checked={settings.tweaks?.showFavoriteButton !== false}
                  onChange={() =>
                    onUpdateSettings({
                      tweaks: {
                        ...DEFAULT_APP_TWEAKS,
                        ...settings.tweaks,
                        showFavoriteButton: settings.tweaks?.showFavoriteButton === false,
                      },
                    })
                  }
                  ariaLabel="Toggle favorite button"
                />
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5 font-bold text-sm text-[var(--text-primary)]">
                  <PlusCircle className="w-4 h-4 text-[var(--accent-primary)]" />
                  <span>Add to List Button</span>
                </div>
                <M3Switch
                  checked={settings.tweaks?.showAddToListButton !== false}
                  onChange={() =>
                    onUpdateSettings({
                      tweaks: {
                        ...DEFAULT_APP_TWEAKS,
                        ...settings.tweaks,
                        showAddToListButton: settings.tweaks?.showAddToListButton === false,
                      },
                    })
                  }
                  ariaLabel="Toggle add to list button"
                />
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5 font-bold text-sm text-[var(--text-primary)]">
                  <CheckSquare className="w-4 h-4 text-[var(--accent-primary)]" />
                  <span>Watched / Watching Button</span>
                </div>
                <M3Switch
                  checked={settings.tweaks?.showWatchedButton !== false}
                  onChange={() =>
                    onUpdateSettings({
                      tweaks: {
                        ...DEFAULT_APP_TWEAKS,
                        ...settings.tweaks,
                        showWatchedButton: settings.tweaks?.showWatchedButton === false,
                      },
                    })
                  }
                  ariaLabel="Toggle watched button"
                />
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5 font-bold text-sm text-[var(--text-primary)]">
                  <Bookmark className="w-4 h-4 text-[var(--accent-primary)]" />
                  <span>Watchlist Button</span>
                </div>
                <M3Switch
                  checked={settings.tweaks?.showWatchlistButton !== false}
                  onChange={() =>
                    onUpdateSettings({
                      tweaks: {
                        ...DEFAULT_APP_TWEAKS,
                        ...settings.tweaks,
                        showWatchlistButton: settings.tweaks?.showWatchlistButton === false,
                      },
                    })
                  }
                  ariaLabel="Toggle watchlist button"
                />
              </div>
            </div>
          </div>
        );

      case 'tips':
        return (
          <div className="space-y-4">
            {/* Header / Intro Card */}
            <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xs p-5 sm:p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] flex items-center justify-center shrink-0 border border-[var(--border-subtle)] shadow-xs">
                <Lightbulb className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-[var(--text-primary)] tracking-tight">
                  Pro Tips & Hidden Tricks
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Unlock the full power of EHSAAN PLAY with tactile gestures, shortcuts, and customizer tools.
                </p>
              </div>
            </div>

            {/* Responsive 2-Column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              {/* Tip 1: Long-Press Poster Menu */}
              <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xs p-4 sm:p-5 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-black text-sm text-[var(--text-primary)]">
                      <div className="w-8 h-8 rounded-xl bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] flex items-center justify-center shrink-0">
                        <MousePointerClick className="w-4 h-4" />
                      </div>
                      <span>Quick Action Popup</span>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[var(--chip-bg)] text-[var(--text-secondary)]">
                      Poster
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Long-press (or right-click) any movie or TV poster to open the compact 4-button quick menu: toggle watchlist, cycle watch status, add to collections, or delete instantly.
                  </p>
                </div>
                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-bold text-[var(--accent-primary)]">
                  <span>Hold ~450ms on poster</span>
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Tip 2: Long-Press Search Button (Swap Layout) */}
              <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xs p-4 sm:p-5 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-black text-sm text-[var(--text-primary)]">
                      <div className="w-8 h-8 rounded-xl bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] flex items-center justify-center shrink-0">
                        <ArrowLeftRight className="w-4 h-4" />
                      </div>
                      <span>Search & Lists Swap</span>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[var(--chip-bg)] text-[var(--text-secondary)]">
                      Layout
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Long-press the top header Search bar to exchange its position with Custom Lists. Search shifts down into the bottom navigation bar for quick thumb reach, and Lists moves to the top corner.
                  </p>
                </div>
                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-bold text-[var(--accent-primary)]">
                  <span>Hold Search or Lists icon</span>
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Tip 3: Shelf Pencil Edit Mode */}
              <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xs p-4 sm:p-5 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-black text-sm text-[var(--text-primary)]">
                      <div className="w-8 h-8 rounded-xl bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] flex items-center justify-center shrink-0">
                        <Pencil className="w-4 h-4" />
                      </div>
                      <span>Shelf Pencil Edit</span>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[var(--chip-bg)] text-[var(--text-secondary)]">
                      Home
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Tap the floating pencil icon on the Home view to customize your shelves: show or hide Top 10 Movies, Top 10 Series, Continue Watching, or Explore shelves.
                  </p>
                </div>
                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-bold text-[var(--accent-primary)]">
                  <span>Home bottom-right pencil</span>
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Tip 4: Cinematic Preview Customizer */}
              <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xs p-4 sm:p-5 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-black text-sm text-[var(--text-primary)]">
                      <div className="w-8 h-8 rounded-xl bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] flex items-center justify-center shrink-0">
                        <SlidersHorizontal className="w-4 h-4" />
                      </div>
                      <span>Preview Customizer</span>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[var(--chip-bg)] text-[var(--text-secondary)]">
                      Modal
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Inside any movie preview window, tap the Sliders icon in the top right to customize backdrop opacity, rearrange detail cards, and switch action buttons between full text and icon-only.
                  </p>
                </div>
                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-bold text-[var(--accent-primary)]">
                  <span>Top-right Sliders in modal</span>
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Tip 5: 3-Tap Watch Status Cycler */}
              <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xs p-4 sm:p-5 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-black text-sm text-[var(--text-primary)]">
                      <div className="w-8 h-8 rounded-xl bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] flex items-center justify-center shrink-0">
                        <RotateCcw className="w-4 h-4" />
                      </div>
                      <span>3-Tap Status Cycle</span>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[var(--chip-bg)] text-[var(--text-secondary)]">
                      Library
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Tap the watch status button sequentially: 1st tap marks as Watched (Olive), 2nd tap switches to Watching in progress (Accent), and 3rd tap resets the item to unwatched.
                  </p>
                </div>
                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-bold text-[var(--accent-primary)]">
                  <span>Watched → Watching → Reset</span>
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Tip 6: Power Keyboard Shortcuts */}
              <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xs p-4 sm:p-5 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-black text-sm text-[var(--text-primary)]">
                      <div className="w-8 h-8 rounded-xl bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] flex items-center justify-center shrink-0">
                        <Keyboard className="w-4 h-4" />
                      </div>
                      <span>Keyboard Power Keys</span>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[var(--chip-bg)] text-[var(--text-secondary)]">
                      Speed
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Navigate swiftly with one keystroke: press <strong>K</strong> or <strong>Ctrl/Cmd+K</strong> for search, <strong>W</strong> for Watchlist, <strong>L</strong> for Lists, <strong>H</strong> for Home, and <strong>Esc</strong> to close any popup.
                  </p>
                </div>
                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-bold text-[var(--accent-primary)]">
                  <span>K · W · L · H · Esc</span>
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Tip 7: Same-Wi-Fi Device Transfer */}
              <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xs p-4 sm:p-5 flex flex-col justify-between space-y-3 sm:col-span-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-black text-sm text-[var(--text-primary)]">
                      <div className="w-8 h-8 rounded-xl bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] flex items-center justify-center shrink-0">
                        <Wifi className="w-4 h-4" />
                      </div>
                      <span>Same-Wi-Fi Device Transfer</span>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[var(--chip-bg)] text-[var(--text-secondary)]">
                      Local Sync
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Instantly transfer newly added movies, ratings, and watch progress to other devices on the same Wi-Fi network. No cloud accounts, QR codes, or file exports required.
                  </p>
                </div>
                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-bold text-[var(--accent-primary)]">
                  <span>Settings → Device Transfer → Send Changes</span>
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Tip 8: Watchlist Batch Selection */}
              <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xs p-4 sm:p-5 flex flex-col justify-between space-y-3 sm:col-span-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-black text-sm text-[var(--text-primary)]">
                      <div className="w-8 h-8 rounded-xl bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] flex items-center justify-center shrink-0">
                        <CheckSquare className="w-4 h-4" />
                      </div>
                      <span>Watchlist Batch Selection & Curated Share</span>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[var(--chip-bg)] text-[var(--text-secondary)]">
                      Batch Actions
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Toggle the "Long press for Watchlist Batch Selection" option under Tweaks. Once active, long-pressing any watchlist card lets you select multiple movies or series. You can then delete them at once or export/share a custom Change-JSON containing only the selected items!
                  </p>
                </div>
                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-bold text-[var(--accent-primary)]">
                  <span>Settings → Tweaks → Long press for Watchlist Batch Selection</span>
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        );

      case 'storage':
        return (
          <div className="space-y-4">
            {/* Card Group 1: Storage Mode */}
            <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xs divide-y divide-[var(--border-subtle)] overflow-hidden">
              <div className="p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />
                  <div>
                    <div className="font-bold text-sm text-[var(--text-primary)]">Artwork storage mode</div>
                    <div className="text-xs text-[var(--text-secondary)]">Choose how poster and backdrop images are loaded</div>
                  </div>
                </div>

                {/* Segmented Bubbles */}
                <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => handleSelectStorageMode('online')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-center truncate active:scale-95 ${
                      settings.imageStorageMode !== 'offline'
                        ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Online Cloud Stream
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectStorageMode('offline')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-center truncate active:scale-95 ${
                      settings.imageStorageMode === 'offline'
                        ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Offline Local Artwork
                  </button>
                </div>
              </div>

              {/* Cache Stats Row */}
              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-[var(--text-primary)]">Cached artwork volume</div>
                  <div className="text-xs text-[var(--text-secondary)]">{imageCacheStats.count} artwork files stored locally</div>
                </div>
                <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-[var(--chip-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)]">
                  {imageCacheStats.formattedSize}
                </span>
              </div>
            </div>

            {/* Offline Confirmation Alert */}
            {offlinePrompt && (
              <div className="p-4 rounded-2xl bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] text-xs space-y-2 border border-[var(--border-subtle)]">
                <div className="font-extrabold flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Pre-cache Required for Offline</span>
                </div>
                <p>
                  {offlinePrompt.missingCount} library titles are missing offline artwork. Pre-cache now to enable full offline viewing?
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handlePreCacheAndActivateOffline}
                    disabled={isPreCaching}
                    className="px-4 py-1.5 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold text-xs hover:opacity-90 transition"
                  >
                    {isPreCaching ? 'Downloading...' : 'Pre-cache Artwork Now'}
                  </button>
                  <button
                    onClick={() => setOfflinePrompt(null)}
                    className="px-3 py-1.5 rounded-full bg-black/10 font-bold text-xs hover:bg-black/20 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Card Group 2: Actions */}
            <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xs divide-y divide-[var(--border-subtle)] overflow-hidden">
              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div className="pr-3">
                  <div className="font-bold text-sm text-[var(--text-primary)]">Pre-cache all library images</div>
                  <div className="text-xs text-[var(--text-secondary)]">Download high-res posters for entire watchlist</div>
                </div>
                <button
                  type="button"
                  onClick={executePreCache}
                  disabled={isPreCaching || mediaItems.length === 0}
                  className="px-4 py-2 rounded-full bg-[var(--chip-bg)] hover:bg-[var(--accent-primary)] hover:text-[var(--bg-primary)] text-[var(--text-primary)] text-xs font-bold transition border border-[var(--border-subtle)] active:scale-95 disabled:opacity-50 shrink-0"
                >
                  {isPreCaching ? 'Caching...' : 'Pre-cache'}
                </button>
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div className="pr-3">
                  <div className="font-bold text-sm text-[var(--text-primary)]">Clear image cache</div>
                  <div className="text-xs text-[var(--text-secondary)]">Free up storage while preserving watchlist metadata</div>
                </div>
                <button
                  type="button"
                  onClick={handleClearCachedImages}
                  className="px-4 py-2 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold transition border border-rose-500/20 active:scale-95 shrink-0"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        );

      case 'app':
        return (
          <div className="space-y-4">
            {/* Card Group 1: Application Shell & Status */}
            <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xs overflow-hidden p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                      EHSAAN PLAY
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[var(--accent-secondary)] text-[var(--accent-secondary-text)]">
                      {CHANGELOG_VERSIONS[0]?.version || 'v3.0.0'}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {isInstalled ? 'Standalone PWA' : 'Distraction-free cinema journal'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {hasUpdate ? (
                    <button
                      onClick={applyUpdate}
                      disabled={isUpdating}
                      className="px-4 py-2 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-extrabold hover:opacity-90 transition active:scale-95"
                    >
                      {isUpdating ? 'Updating...' : 'Update Ready'}
                    </button>
                  ) : (
                    <button
                      onClick={checkForUpdate}
                      disabled={isChecking}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--chip-bg)] text-[var(--text-primary)] text-xs font-bold border border-[var(--border-subtle)] active:scale-95"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-[var(--accent-primary)] ${isChecking ? 'animate-spin' : ''}`} />
                      <span>{isChecking ? 'Checking...' : checkMessage || 'Check Update'}</span>
                    </button>
                  )}

                  {!isInstalled && isInstallable && (
                    <button
                      onClick={install}
                      className="px-3.5 py-1.5 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold shadow-xs active:scale-95"
                    >
                      Install PWA
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Card Group 2: Latest Release Showcase (GitHub Showcase Card Style) */}
            {CHANGELOG_VERSIONS[0] && (
              <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xs overflow-hidden p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
                    <span className="font-extrabold text-sm text-[var(--text-primary)]">
                      Changelog & Version Notes
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-extrabold">
                    {CHANGELOG_VERSIONS[0].version} (Latest)
                  </span>
                </div>

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
                      <p className="text-xs text-amber-200 font-extrabold mt-1">
                        Dev. Note: The new release v2.3.0 is coming on 5th JANUARY 2027
                      </p>
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

                <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] space-y-3 shadow-2xs border border-[var(--border-subtle)]">
                  <div className="font-extrabold text-xs sm:text-sm flex items-center gap-2">
                    <GitCommit className="w-4 h-4 text-[var(--text-card-olive)] shrink-0" />
                    <span>{CHANGELOG_VERSIONS[0].tagline}</span>
                  </div>

                  <ul className="space-y-2 text-xs sm:text-sm font-medium leading-relaxed">
                    {CHANGELOG_VERSIONS[0].points.map((pt, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[var(--text-card-olive)] flex-none mt-0.5" />
                        <span>
                          {pt.title && <strong className="font-bold">{pt.title}: </strong>}
                          <span>{pt.description}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Older Versions Toggle */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setIsOlderVersionsExpanded(!isOlderVersionsExpanded)}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] text-xs sm:text-sm font-bold transition border border-[var(--border-subtle)] active:scale-[0.99] group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <History className="w-4 h-4 text-[var(--text-card-yellow)] group-hover:rotate-12 transition-transform" />
                      <span>{isOlderVersionsExpanded ? 'Hide Historical Versions' : `Explore Historical Archive (${CHANGELOG_VERSIONS.length - 1} Releases: ${CHANGELOG_VERSIONS[1]?.version || 'v2.1.2'} – ${CHANGELOG_VERSIONS[CHANGELOG_VERSIONS.length - 1]?.version || 'v2.0.0'})`}</span>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-[var(--bg-card-yellow)] flex items-center justify-center border border-black/10">
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isOlderVersionsExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                </div>

                {/* Older Versions Archive */}
                {isOlderVersionsExpanded && (
                  <div className="space-y-4 pt-3 animate-fade-in divide-y divide-[var(--border-subtle)]">
                    {CHANGELOG_VERSIONS.slice(1).map(ver => (
                      <div key={ver.version} className="pt-4 space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] font-extrabold text-xs">
                            {ver.version}
                          </span>
                          <span className="font-bold text-[var(--text-primary)] text-xs sm:text-sm">{ver.tagline}</span>
                        </div>
                        <ul className="space-y-1.5 text-[var(--text-secondary)] pl-2 pt-1">
                          {ver.points.map((pt, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent-primary)] flex-none mt-0.5" />
                              <span>{pt.title ? <strong className="font-bold text-[var(--text-primary)]">{pt.title}: </strong> : null}{pt.description}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'tmdb':
        return (
          <div className="space-y-4">
            {/* Card Group 1: API Key & Diagnostics */}
            <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xs divide-y divide-[var(--border-subtle)] overflow-hidden">
              <div className="p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />
                  <div>
                    <div className="font-bold text-sm text-[var(--text-primary)]">Custom TMDB API Key</div>
                    <div className="text-xs text-[var(--text-secondary)]">Use personal key or default system cloud key</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={e => setApiKeyInput(e.target.value)}
                    placeholder="Enter TMDB v3 Key (Leave empty for system default)"
                    className="flex-1 px-4 py-2 rounded-xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ tmdbApiKey: apiKeyInput.trim() || undefined });
                      setCopySuccess(true);
                      setTimeout(() => setCopySuccess(false), 2000);
                    }}
                    className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold transition active:scale-95 shrink-0 shadow-xs"
                  >
                    Save
                  </button>
                </div>
                {copySuccess && <p className="text-xs text-emerald-500 font-bold">API Key saved successfully!</p>}
              </div>

              {/* Health Diagnostic */}
              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-[var(--text-primary)]">Connection health test</div>
                  <div className="text-xs text-[var(--text-secondary)]">Ping TMDB endpoints to verify reachability & latency</div>
                </div>

                <button
                  type="button"
                  onClick={handleRunDiagnostic}
                  disabled={isRunningDiagnostic}
                  className="px-4 py-2 rounded-full bg-[var(--chip-bg)] hover:bg-[var(--accent-primary)] hover:text-[var(--bg-primary)] text-[var(--text-primary)] text-xs font-bold transition border border-[var(--border-subtle)] active:scale-95 disabled:opacity-50 shrink-0"
                >
                  {isRunningDiagnostic ? 'Testing...' : 'Run Test'}
                </button>
              </div>

              {diagnosticResult && (
                <div className="p-4 bg-[var(--chip-bg)]/40 flex items-center gap-3">
                  {diagnosticResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : (
                    <X className="w-5 h-5 text-rose-500 shrink-0" />
                  )}
                  <div className="text-xs">
                    <div className="font-bold text-[var(--text-primary)]">
                      {diagnosticResult.success ? 'Connection Healthy' : 'Diagnostic Failed'}
                    </div>
                    <div className="text-[var(--text-secondary)]">
                      {diagnosticResult.message} ({diagnosticResult.latencyMs}ms)
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'shortcuts':
        return (
          <div className="space-y-4">
            {/* Card Group 1: Custom Shortcuts List */}
            <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xs divide-y divide-[var(--border-subtle)] overflow-hidden">
              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Keyboard className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />
                  <div>
                    <div className="font-bold text-sm text-[var(--text-primary)]">Keyboard shortcuts</div>
                    <div className="text-xs text-[var(--text-secondary)]">Tap key button to record a custom shortcut</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ keyboardShortcuts: DEFAULT_KEYBOARD_SHORTCUTS })}
                  className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Reset
                </button>
              </div>

              {[
                { key: 'goBack' as const, label: 'Back / Close Action' },
                { key: 'goHome' as const, label: 'Home Page' },
                { key: 'goWatchlist' as const, label: 'Watchlist Page' },
                { key: 'openSearch' as const, label: 'Search Modal' },
                { key: 'goLists' as const, label: 'Custom Lists Page' },
              ].map(item => {
                const currentKey = shortcuts[item.key] || DEFAULT_KEYBOARD_SHORTCUTS[item.key];
                const isRecording = recordingAction === item.key;

                return (
                  <div key={item.key} className="p-4 sm:p-5 flex items-center justify-between">
                    <div className="font-bold text-sm text-[var(--text-primary)]">{item.label}</div>
                    <button
                      onClick={() => setRecordingAction(isRecording ? null : item.key)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 active:scale-95 ${
                        isRecording
                          ? 'bg-amber-500 text-white animate-pulse'
                          : 'bg-[var(--chip-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:bg-[var(--accent-primary)] hover:text-[var(--bg-primary)]'
                      }`}
                    >
                      <kbd className="font-mono uppercase font-black">{isRecording ? 'Press key...' : currentKey}</kbd>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'backup':
        return (
          <div className="space-y-4">
            {/* Card Group 1: Storage Metrics & Backup Actions */}
            <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xs divide-y divide-[var(--border-subtle)] overflow-hidden">
              <div className="p-4 sm:p-5">
                <div className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">
                  Full Library Backup
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] text-center">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Journal Storage</div>
                    <div className="text-base font-black tabular-nums">~{storageStats.usedKb} KB</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Cached Titles</div>
                    <div className="text-base font-black tabular-nums">{storageStats.totalItems}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Watchlist</div>
                    <div className="text-base font-black tabular-nums">{storageStats.watchlistCount}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Lists</div>
                    <div className="text-base font-black tabular-nums">{storageStats.listsCount}</div>
                  </div>
                </div>
              </div>

              {/* Action Rows */}
              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div className="pr-3">
                  <div className="font-bold text-sm text-[var(--text-primary)]">Export backup JSON</div>
                  <div className="text-xs text-[var(--text-secondary)]">Save complete movie journal and watchlist to a file</div>
                </div>
                <button
                  type="button"
                  onClick={handleExport}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold shadow-xs active:scale-95 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div className="pr-3">
                  <div className="font-bold text-sm text-[var(--text-primary)]">Restore backup</div>
                  <div className="text-xs text-[var(--text-secondary)]">Import previously exported JSON journal backup</div>
                </div>
                <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--chip-bg)] text-[var(--text-primary)] text-xs font-bold border border-[var(--border-subtle)] active:scale-95 cursor-pointer shrink-0">
                  <Upload className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                  <span>Restore</span>
                  <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div className="pr-3">
                  <div className="font-bold text-sm text-[var(--text-primary)]">Clear cached titles & images</div>
                  <div className="text-xs text-[var(--text-secondary)]">Safely free storage without deleting personal entries</div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Clear pre-cached poster artwork and offline metadata? Your personal notes, ratings, and watchlist will NOT be deleted.')) {
                      if (onClearCachedTitlesAndImages) {
                        await onClearCachedTitlesAndImages();
                      } else {
                        await clearImageCache();
                      }
                      const newImgStats = await getImageCacheStats();
                      setImageCacheStats(newImgStats);
                      setStorageStats(getStorageStats());
                      setImportFeedback({
                        success: true,
                        message: 'Cleared cached titles and offline images!',
                      });
                      setTimeout(() => setImportFeedback(null), 3000);
                    }
                  }}
                  className="px-4 py-2 rounded-full bg-[var(--chip-bg)] text-[var(--text-primary)] text-xs font-bold border border-[var(--border-subtle)] active:scale-95 shrink-0"
                >
                  Clean Cache
                </button>
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div className="pr-3">
                  <div className="font-bold text-sm text-[#991B1B] dark:text-[#F87171]">Delete all data</div>
                  <div className="text-xs text-[var(--text-secondary)]">Permanently erase all watchlists, ratings, notes, and playlists</div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to delete all saved items and settings? This cannot be undone.')) {
                      await onDeleteAllData();
                      const newImgStats = await getImageCacheStats();
                      setImageCacheStats(newImgStats);
                      setStorageStats(getStorageStats());
                    }
                  }}
                  className="px-4 py-2 rounded-full bg-[#7F1D1D] hover:bg-[#991B1B] text-white text-xs font-black shadow-xs active:scale-95 shrink-0"
                >
                  Delete All
                </button>
              </div>
            </div>

            {importFeedback && (
              <p className={`text-xs font-bold px-3 ${importFeedback.success ? 'text-emerald-500' : 'text-rose-500'}`}>
                {importFeedback.message}
              </p>
            )}
          </div>
        );

      case 'about':
        return (
          <div className="space-y-4">
            {/* Card Group 1: App Header Card */}
            <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xs overflow-hidden p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] flex items-center justify-center overflow-hidden border border-[var(--border-subtle)] shrink-0 shadow-2xs p-2.5">
                    <svg
                      viewBox="0 0 64 64"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-full h-full stroke-[var(--text-card-olive)] stroke-[3.2]"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {/* Top angled clapper stick */}
                      <g transform="rotate(-6 32 20)">
                        <rect x="8" y="10" width="48" height="11" rx="3.5" fill="var(--bg-primary)" />
                        <line x1="18" y1="10" x2="22" y2="21" />
                        <line x1="28" y1="10" x2="32" y2="21" />
                        <line x1="38" y1="10" x2="42" y2="21" />
                        <line x1="48" y1="10" x2="52" y2="21" />
                      </g>

                      {/* Main Clapper Body */}
                      <rect x="8" y="24" width="48" height="32" rx="6" fill="var(--bg-primary)" />

                      {/* Centered Play Mark */}
                      <polygon
                        points="28,34 28,46 40,40"
                        fill="var(--accent-primary)"
                        stroke="var(--accent-primary)"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-[var(--text-primary)]">
                      EHSAAN PLAY
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">{CHANGELOG_VERSIONS[0]?.version || 'v3.0.0'} (Stable)</p>
                  </div>
                </div>

                {/* Right circle social icons & Start Guide */}
                <div className="flex items-center gap-2">
                  {onReplayGuide && (
                    <button
                      type="button"
                      onClick={onReplayGuide}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-[var(--chip-bg)] text-[var(--text-primary)] hover:bg-[var(--accent-primary)] hover:text-[var(--bg-primary)] text-xs font-bold transition active:scale-95 shadow-2xs border border-[var(--border-subtle)]"
                      title="Replay introductory start guide"
                    >
                      <Compass className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Start Guide</span>
                    </button>
                  )}
                  <a
                    href="https://github.com/ehsaanullah0/ehsaanplay"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-[var(--chip-bg)] text-[var(--text-primary)] flex items-center justify-center hover:bg-[var(--accent-primary)] hover:text-[var(--bg-primary)] transition active:scale-95 shadow-2xs border border-[var(--border-subtle)]"
                    aria-label="GitHub Repository"
                  >
                    <Github className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Card Group 2: EHSAAN ECOSYSTEM */}
            <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xs overflow-hidden p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-3 pb-2 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] flex items-center justify-center shrink-0 border border-[var(--border-subtle)] shadow-2xs">
                    <Sparkles className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-[var(--text-primary)] tracking-tight">
                      EHSAAN ECOSYSTEM
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Thoughtfully crafted, minimal tools sharing the same design ethos
                    </p>
                  </div>
                </div>
                <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[var(--chip-bg)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                  4 Apps
                </span>
              </div>

              {/* Ecosystem Apps Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                {/* 1. EHSAAN FLOW */}
                <a
                  href="https://ehsaanflow.ai.studio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative p-4.5 rounded-2xl bg-[var(--bg-primary)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] transition-all duration-200 active:scale-[0.99] flex flex-col justify-between space-y-3.5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] flex items-center justify-center shrink-0 border border-[var(--border-subtle)] group-hover:scale-105 transition-transform">
                        <CheckSquare className="w-5 h-5 stroke-[2.2]" />
                      </div>
                      <div>
                        <h5 className="font-extrabold text-sm text-[var(--text-primary)] tracking-wide">
                          EHSAAN FLOW
                        </h5>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2 leading-relaxed">
                          A to-do list and work management app
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[var(--border-subtle)]">
                    <span className="font-mono text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                      ehsaanflow.ai.studio
                    </span>
                    <span className="font-bold text-[10px] uppercase tracking-wider text-[var(--accent-primary)] group-hover:underline">
                      Open App →
                    </span>
                  </div>
                </a>

                {/* 2. EHSAAN QR */}
                <a
                  href="https://ehsaanqr.ai.studio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative p-4.5 rounded-2xl bg-[var(--bg-primary)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] transition-all duration-200 active:scale-[0.99] flex flex-col justify-between space-y-3.5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] flex items-center justify-center shrink-0 border border-[var(--border-subtle)] group-hover:scale-105 transition-transform">
                        <QrCode className="w-5 h-5 stroke-[2.2]" />
                      </div>
                      <div>
                        <h5 className="font-extrabold text-sm text-[var(--text-primary)] tracking-wide">
                          EHSAAN QR
                        </h5>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2 leading-relaxed">
                          A beautiful QR code generator
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[var(--border-subtle)]">
                    <span className="font-mono text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                      ehsaanqr.ai.studio
                    </span>
                    <span className="font-bold text-[10px] uppercase tracking-wider text-[var(--accent-primary)] group-hover:underline">
                      Open App →
                    </span>
                  </div>
                </a>

                {/* 3. EHSAAN COMPRESS */}
                <a
                  href="https://ehsaancompress.ai.studio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative p-4.5 rounded-2xl bg-[var(--bg-primary)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] transition-all duration-200 active:scale-[0.99] flex flex-col justify-between space-y-3.5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] flex items-center justify-center shrink-0 border border-[var(--border-subtle)] group-hover:scale-105 transition-transform">
                        <Minimize2 className="w-5 h-5 stroke-[2.2]" />
                      </div>
                      <div>
                        <h5 className="font-extrabold text-sm text-[var(--text-primary)] tracking-wide">
                          EHSAAN COMPRESS
                        </h5>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2 leading-relaxed">
                          A minimal image compress and bg remover
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[var(--border-subtle)]">
                    <span className="font-mono text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                      ehsaancompress.ai.studio
                    </span>
                    <span className="font-bold text-[10px] uppercase tracking-wider text-[var(--accent-primary)] group-hover:underline">
                      Open App →
                    </span>
                  </div>
                </a>

                {/* 4. EHSAAN COLOUR */}
                <a
                  href="https://ehsaancolour.ai.studio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative p-4.5 rounded-2xl bg-[var(--bg-primary)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] transition-all duration-200 active:scale-[0.99] flex flex-col justify-between space-y-3.5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] flex items-center justify-center shrink-0 border border-[var(--border-subtle)] group-hover:scale-105 transition-transform">
                        <Palette className="w-5 h-5 stroke-[2.2]" />
                      </div>
                      <div>
                        <h5 className="font-extrabold text-sm text-[var(--text-primary)] tracking-wide">
                          EHSAAN COLOUR
                        </h5>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2 leading-relaxed">
                          A colour and design inspiration hub
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[var(--border-subtle)]">
                    <span className="font-mono text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                      ehsaancolour.ai.studio
                    </span>
                    <span className="font-bold text-[10px] uppercase tracking-wider text-[var(--accent-primary)] group-hover:underline">
                      Open App →
                    </span>
                  </div>
                </a>
              </div>
            </div>

            {/* Card Group 3: Developer Card */}
            <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xs overflow-hidden p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] flex items-center justify-center font-extrabold text-lg border border-[var(--border-subtle)] shadow-2xs shrink-0">
                  <Code2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-[var(--text-primary)]">
                    EHSAAN ULLAH
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)]">Lead Developer & Cinephile</p>
                </div>
              </div>

              {/* Circle Social & Action Buttons Row (Opposite/Complementary Card Color) */}
              <div className="flex items-center gap-2.5 pt-1">
                <a
                  href="https://github.com/ehsaanullah0/ehsaanplay"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] flex items-center justify-center hover:scale-105 hover:opacity-90 transition active:scale-95 border border-[var(--border-subtle)] shadow-2xs"
                  aria-label="GitHub"
                >
                  <Github className="w-4 h-4 text-[var(--text-card-yellow)]" />
                </a>

                <a
                  href="https://ehsaan.odoo.com/support"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] flex items-center justify-center hover:scale-105 hover:opacity-90 transition active:scale-95 border border-[var(--border-subtle)] shadow-2xs"
                  aria-label="Support Project"
                >
                  <Coffee className="w-4 h-4 text-[var(--text-card-yellow)]" />
                </a>

                <a
                  href="https://ehsaan.odoo.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] flex items-center justify-center hover:scale-105 hover:opacity-90 transition active:scale-95 border border-[var(--border-subtle)] shadow-2xs"
                  aria-label="Website"
                >
                  <Globe className="w-4 h-4 text-[var(--text-card-yellow)]" />
                </a>

                <a
                  href="mailto:worsmon@proton.me"
                  className="w-10 h-10 rounded-full bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] flex items-center justify-center hover:scale-105 hover:opacity-90 transition active:scale-95 border border-[var(--border-subtle)] shadow-2xs"
                  aria-label="Email"
                >
                  <Mail className="w-4 h-4 text-[var(--text-card-yellow)]" />
                </a>
              </div>
            </div>

            {/* Card Group 3: Links & Support Group */}
            <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] shadow-2xs divide-y divide-[var(--border-subtle)] overflow-hidden">
              <a
                href="https://ehsaan.odoo.com/support"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 sm:p-5 flex items-center justify-between hover:bg-[var(--bg-surface-elevated)] transition group"
              >
                <div className="flex items-center gap-3">
                  <Coffee className="w-5 h-5 text-[var(--accent-primary)] group-hover:rotate-12 transition-transform shrink-0" />
                  <div>
                    <div className="font-bold text-sm text-[var(--text-primary)]">BuyMeACoffee</div>
                    <div className="text-xs text-[var(--text-secondary)]">Support EHSAAN PLAY with a small donation</div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-[var(--text-secondary)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>

              <button
                type="button"
                onClick={() => handleSelectTopic('app')}
                className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-[var(--bg-surface-elevated)] transition text-left group"
              >
                <div className="flex items-center gap-3">
                  <History className="w-5 h-5 text-[var(--accent-primary)] group-hover:rotate-12 transition-transform shrink-0" />
                  <div>
                    <div className="font-bold text-sm text-[var(--text-primary)]">Changelog & Version Notes</div>
                    <div className="text-xs text-[var(--text-secondary)]">View latest v2.8.0 updates & historical archive</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:translate-x-0.5 transition-transform" />
              </button>

              <a
                href="https://github.com/ehsaanullah0/ehsaanplay/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 sm:p-5 flex items-center justify-between hover:bg-[var(--bg-surface-elevated)] transition group"
              >
                <div className="flex items-center gap-3">
                  <Code2 className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />
                  <div>
                    <div className="font-bold text-sm text-[var(--text-primary)]">License</div>
                    <div className="text-xs text-[var(--text-secondary)]">GNU General Public License v3.0 (GPL-3) · Open Source</div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-[var(--text-secondary)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-28 md:pb-16 text-[var(--text-primary)]">
      {/* ========================================================================= */}
      {/* MOBILE VIEW (< md): Topic Hub Menu or Sub-Page View                       */}
      {/* ========================================================================= */}
      <div className="block md:hidden">
        {selectedTopic === null ? (
          /* Mobile Topic Hub List */
          <div className="space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                Preferences
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight mt-0.5 text-[var(--text-primary)]">
                Settings
              </h1>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Customize appearance, local storage, offline artwork, and metadata
              </p>
            </div>

            {/* Grouped Topics List Container */}
            <div className="space-y-2.5">
              {topics.map(topic => (
                <button
                  key={topic.id}
                  onClick={() => handleSelectTopic(topic.id)}
                  className="w-full flex items-center justify-between p-4 sm:p-4.5 rounded-2xl bg-[var(--bg-surface-card)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-left transition-all active:scale-[0.99] shadow-2xs group"
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-2">
                    <div className="w-10 h-10 rounded-xl bg-[var(--chip-bg)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {topic.icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
                        {topic.title}
                      </h3>
                      <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                        {topic.subtitle}
                      </p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] flex items-center justify-center shrink-0 shadow-2xs border border-[var(--border-subtle)] group-hover:scale-110 transition-transform">
                    <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                  </div>
                </button>
              ))}
            </div>

            {/* Quick Reset Footer on Mobile Hub */}
            <div className="pt-4 text-center space-y-2">
              <button
                onClick={async () => {
                  if (window.confirm('Delete all saved library data and settings?')) {
                    await onDeleteAllData();
                    const newImgStats = await getImageCacheStats();
                    setImageCacheStats(newImgStats);
                    setStorageStats(getStorageStats());
                  }
                }}
                className="text-xs font-semibold text-rose-500/80 hover:text-rose-500 transition"
              >
                Reset stats & library
              </button>
            </div>
          </div>
        ) : (
          /* Mobile Sub-Page View */
          <div className="space-y-5 animate-fade-in">
            {/* Top Navigation Back Bar */}
            <div className="flex items-center gap-3.5">
              <button
                onClick={() => handleSelectTopic(null)}
                aria-label="Back to settings"
                className="w-10 h-10 rounded-full bg-[var(--chip-bg)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] flex items-center justify-center transition active:scale-95 border border-[var(--border-subtle)] shadow-2xs shrink-0"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              </button>
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
                  {currentTopic.title}
                </h2>
                <p className="text-xs text-[var(--text-secondary)] font-medium">Settings</p>
              </div>
            </div>

            {/* Inner Content */}
            <div className="mt-2">
              {renderTopicContent(selectedTopic)}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP & TABLET VIEW (>= md): Master-Detail Split Screen Sidebar Layout  */}
      {/* ========================================================================= */}
      <div className="hidden md:flex items-start gap-8">
        {/* Left Sticky Sidebar: Topic List */}
        <aside className="w-72 lg:w-84 shrink-0 sticky top-20 space-y-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
              Preferences
            </span>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight mt-0.5 text-[var(--text-primary)]">
              Settings
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Select a category to customize
            </p>
          </div>

          <nav className="space-y-1.5" aria-label="Settings Categories">
            {topics.map(topic => {
              const isSelected = (selectedTopic || 'app') === topic.id;
              return (
                <button
                  key={topic.id}
                  onClick={() => handleSelectTopic(topic.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left transition-all active:scale-[0.98] ${
                    isSelected
                      ? 'bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] shadow-xs font-bold border border-transparent'
                      : 'bg-[var(--bg-surface-card)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-black/15 text-[var(--text-card-olive)]'
                          : 'bg-[var(--chip-bg)] text-[var(--accent-primary)]'
                      }`}
                    >
                      {topic.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs lg:text-sm font-bold truncate">
                        {topic.title}
                      </div>
                      <div className={`text-[11px] truncate mt-0.5 ${isSelected ? 'opacity-90' : 'text-[var(--text-secondary)]'}`}>
                        {topic.subtitle}
                      </div>
                    </div>
                  </div>
                  {/* Filled Circle with Yellow Colour in Arrow */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform ${
                      isSelected
                        ? 'bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] shadow-xs scale-105 border border-black/10'
                        : 'bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] opacity-85 group-hover:opacity-100 group-hover:scale-105 border border-[var(--border-subtle)]'
                    }`}
                  >
                    <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right Main Canvas: Active Topic Inner Settings Full Screen */}
        <main className="flex-1 min-w-0 animate-fade-in">
          {/* Header of Active Topic */}
          <div className="mb-6 flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                <span>Settings</span>
                <span>/</span>
                <span className="text-[var(--text-primary)]">{currentTopic.title}</span>
              </div>
              <h2 className="text-xl lg:text-2xl font-extrabold text-[var(--text-primary)] mt-0.5">
                {currentTopic.title}
              </h2>
            </div>
          </div>

          {/* Render Active Topic Inner Settings */}
          <div className="w-full">
            {renderTopicContent(selectedTopic || 'app')}
          </div>
        </main>
      </div>
    </div>
  );
};
