/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ActiveTab, MediaItem, DEFAULT_KEYBOARD_SHORTCUTS, DEFAULT_APP_TWEAKS } from './types/movie';
import { useMediaLibrary } from './hooks/useMediaLibrary';
import { Header } from './components/layout/Header';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { OfflineToast } from './components/layout/OfflineToast';
import { HomeView } from './components/home/HomeView';
import { WatchlistView } from './components/watchlist/WatchlistView';
import { ListsView } from './components/lists/ListsView';
import { SettingsView, SettingsTopicId } from './components/settings/SettingsView';
import { MoviePreviewModal } from './components/preview/MoviePreviewModal';
import { SearchModal } from './components/search/SearchModal';
import { RandomModal } from './components/watchlist/RandomModal';
import { StartGuideModal } from './components/onboarding/StartGuideModal';
import { UpdateNotification } from './components/layout/UpdateNotification';
import { SwapNavModal } from './components/common/SwapNavModal';
import { usePWAUpdate } from './hooks/usePWAInstall';
import { deviceTransferService, IncomingTransferEvent } from './services/deviceTransfer';
import { applyRecentChanges } from './services/recentChanges';
import { Wifi, Check } from 'lucide-react';

export default function App() {
  const { hasUpdate, isUpdating, applyUpdate, dismissUpdate } = usePWAUpdate();
  const {
    isInitialized,
    mediaItems,
    userStates,
    customLists,
    settings,
    stats,
    updateSettings,
    hydrateMediaDetails,
    toggleWatchlist,
    removeFromWatchlist,
    dismissFromWatching,
    markWatching,
    markWatched,
    toggleWatched,
    toggleFavorite,
    setPersonalRating,
    setNotes,
    setProgress,
    toggleTVEpisode,
    toggleSeasonEpisodes,
    createCustomList,
    updateCustomList,
    deleteCustomList,
    addItemToList,
    removeItemFromList,
    addMediaToLibrary,
    getRandomItem,
    deleteAllData,
    clearCachedTitlesAndImages,
    restoreBackup,
    refreshLibrary,
  } = useMediaLibrary();

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [randomModalItem, setRandomModalItem] = useState<MediaItem | null>(null);
  const [watchlistInitialFilter, setWatchlistInitialFilter] = useState<string>('watchlist');
  const [backToastMessage, setBackToastMessage] = useState<string | null>(null);
  const [settingsTopic, setSettingsTopic] = useState<SettingsTopicId | null>(null);
  const [isSwapNavConfirmOpen, setIsSwapNavConfirmOpen] = useState(false);
  const [globalIncomingTransfer, setGlobalIncomingTransfer] = useState<IncomingTransferEvent | null>(null);

  const [syncSuccessToast, setSyncSuccessToast] = useState<string | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('ehsaan_start_guide_completed_v1');
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // Listen for incoming Wi-Fi transfers across all screens persistently
    const unsubscribe = deviceTransferService.startReceivingMode(transfer => {
      setGlobalIncomingTransfer(transfer);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleGlobalAcceptTransfer = () => {
    if (!globalIncomingTransfer) return;
    try {
      const applyResult = applyRecentChanges({
        format: 'ehsaan-play-recent-changes',
        version: 1,
        exportedAt: globalIncomingTransfer.timestamp,
        fromChangeId: globalIncomingTransfer.payload.fromChangeId,
        toChangeId: globalIncomingTransfer.payload.toChangeId,
        changeCount: globalIncomingTransfer.payload.changes.length,
        changes: globalIncomingTransfer.payload.changes,
      });
      if (applyResult.success) {
        deviceTransferService.respondToIncomingTransfer(
          globalIncomingTransfer.sourceDevice.deviceId,
          globalIncomingTransfer.transferId,
          'accept'
        );
        const added = applyResult.newItemsCount;
        const updated = applyResult.updatesCount;
        setSyncSuccessToast(`✓ Library Synced: ${added} new title${added !== 1 ? 's' : ''} • ${updated} update${updated !== 1 ? 's' : ''} from ${globalIncomingTransfer.sourceDevice.deviceName}`);
        setTimeout(() => setSyncSuccessToast(null), 4000);
        refreshLibrary();
      }
    } finally {
      setGlobalIncomingTransfer(null);
    }
  };

  const handleGlobalDeclineTransfer = () => {
    if (!globalIncomingTransfer) return;
    deviceTransferService.respondToIncomingTransfer(
      globalIncomingTransfer.sourceDevice.deviceId,
      globalIncomingTransfer.transferId,
      'decline'
    );
    setGlobalIncomingTransfer(null);
  };

  const isSwappedNav = Boolean(settings.swapSearchAndLists || settings.tweaks?.swapSearchAndLists);

  const handleConfirmSwapNav = () => {
    const nextVal = !isSwappedNav;
    updateSettings({
      swapSearchAndLists: nextVal,
      tweaks: {
        ...DEFAULT_APP_TWEAKS,
        ...settings.tweaks,
        swapSearchAndLists: nextVal,
      },
    });
  };

  const lastBackPressTimeRef = useRef<number>(0);
  const selectedMediaRef = useRef<MediaItem | null>(null);
  const isSearchOpenRef = useRef<boolean>(false);
  const randomModalItemRef = useRef<MediaItem | null>(null);
  const activeTabRef = useRef<ActiveTab>('home');

  // Keep refs synchronized
  useEffect(() => {
    selectedMediaRef.current = selectedMedia;
  }, [selectedMedia]);

  useEffect(() => {
    isSearchOpenRef.current = isSearchOpen;
  }, [isSearchOpen]);

  useEffect(() => {
    randomModalItemRef.current = randomModalItem;
  }, [randomModalItem]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Universal & Custom Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      const target = e.target as HTMLElement | null;
      const isTyping = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      );
      if (isTyping) return;

      const shortcuts = settings.keyboardShortcuts || DEFAULT_KEYBOARD_SHORTCUTS;
      const pressedKey = e.key;
      const normalize = (k: string) => k.toLowerCase().trim();
      const pKey = normalize(pressedKey);

      // 1. Back / Close Action
      if (
        pKey === normalize(shortcuts.goBack) ||
        (shortcuts.goBack === 'Escape' && pressedKey === 'Escape')
      ) {
        if (isSearchOpenRef.current) setIsSearchOpen(false);
        else if (selectedMediaRef.current) setSelectedMedia(null);
        else if (randomModalItemRef.current) setRandomModalItem(null);
        return;
      }

      // 2. Open Search Modal
      if (
        pKey === normalize(shortcuts.openSearch) ||
        ((e.metaKey || e.ctrlKey) && pKey === 'k')
      ) {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
        return;
      }

      // 3. Go to Home Page
      if (pKey === normalize(shortcuts.goHome)) {
        e.preventDefault();
        setActiveTab('home');
        return;
      }

      // 4. Go to Watchlist Page
      if (pKey === normalize(shortcuts.goWatchlist)) {
        e.preventDefault();
        setActiveTab('watchlist');
        return;
      }

      // 5. Go to Custom Lists Page
      if (pKey === normalize(shortcuts.goLists)) {
        e.preventDefault();
        setActiveTab('lists');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.keyboardShortcuts]);

  // Back gesture navigation trap (Double-back to exit on home screen, otherwise back closes modals/tabs)
  useEffect(() => {
    try {
      window.history.pushState({ page: 'ehsaan-home' }, '');
    } catch {
      // Ignore pushState errors in sandboxed iframes
    }

    const handlePopState = () => {
      // 1. If Preview modal is open, close preview
      if (selectedMediaRef.current) {
        setSelectedMedia(null);
        try {
          window.history.pushState({ page: 'ehsaan-home' }, '');
        } catch {
          // ignore
        }
        return;
      }

      // 2. If Search modal is open, close search
      if (isSearchOpenRef.current) {
        setIsSearchOpen(false);
        try {
          window.history.pushState({ page: 'ehsaan-home' }, '');
        } catch {
          // ignore
        }
        return;
      }

      // 3. If Random Pick modal is open, close random pick
      if (randomModalItemRef.current) {
        setRandomModalItem(null);
        try {
          window.history.pushState({ page: 'ehsaan-home' }, '');
        } catch {
          // ignore
        }
        return;
      }

      // 4. If on another tab, go back to Home tab
      if (activeTabRef.current !== 'home') {
        setActiveTab('home');
        try {
          window.history.pushState({ page: 'ehsaan-home' }, '');
        } catch {
          // ignore
        }
        return;
      }

      // 5. On Home tab: double back within 2 seconds to exit
      const now = Date.now();
      if (now - lastBackPressTimeRef.current < 2000) {
        // Allow exit
        return;
      } else {
        lastBackPressTimeRef.current = now;
        setBackToastMessage('Press back again to exit');
        setTimeout(() => setBackToastMessage(null), 2000);
        try {
          window.history.pushState({ page: 'ehsaan-home' }, '');
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navigate to Watchlist with a specific initial filter
  const handleNavigateToWatchlistWithFilter = useCallback((status: string = 'all') => {
    setWatchlistInitialFilter(status);
    setActiveTab('watchlist');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Quick Random Pick trigger from top bar or home
  const handleTriggerRandomGlobal = useCallback(() => {
    const picked = getRandomItem();
    if (picked) {
      setRandomModalItem(picked);
    }
  }, [getRandomItem]);

  // Navigate directly to Changelog inside Settings > EHSAAN PLAY
  const handleOpenChangelog = useCallback(() => {
    setSettingsTopic('app');
    setActiveTab('settings');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200 selection:bg-[var(--accent-primary)] selection:text-[var(--bg-primary)]">
      {/* Top Bar Navigation */}
      <Header
        activeTab={activeTab}
        onSelectTab={tab => {
          if (tab === 'settings') {
            setSettingsTopic(null);
          }
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenSearch={() => setIsSearchOpen(true)}
        onRandomPick={handleTriggerRandomGlobal}
        autoHideHeader={settings.tweaks?.autoHideHeader !== false}
        swapSearchAndLists={isSwappedNav}
        onTriggerSwapConfirm={() => setIsSwapNavConfirmOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {activeTab === 'home' && (
          <HomeView
            mediaItems={mediaItems}
            userStates={userStates}
            stats={stats}
            onSelectMedia={setSelectedMedia}
            onNavigateTab={setActiveTab}
            onNavigateToWatchlistWithFilter={handleNavigateToWatchlistWithFilter}
            homeSections={settings.homeSections}
            onUpdateHomeSections={sections => updateSettings({ homeSections: sections })}
            onRemoveFromWatchlist={removeFromWatchlist}
            onDismissFromWatching={dismissFromWatching}
            onMarkWatching={markWatching}
            onMarkWatched={markWatched}
            onToggleWatchlist={toggleWatchlist}
            onToggleFavorite={toggleFavorite}
            tmdbApiKey={settings.tmdbApiKey}
            onAddMediaToLibrary={addMediaToLibrary}
            onOpenChangelog={handleOpenChangelog}
          />
        )}

        {activeTab === 'watchlist' && (
          <WatchlistView
            mediaItems={mediaItems}
            userStates={userStates}
            onSelectMedia={setSelectedMedia}
            initialFilterStatus={'watchlist'}
            onRemoveFromWatchlist={removeFromWatchlist}
            onMarkWatching={markWatching}
            onMarkWatched={markWatched}
            onDismissFromWatching={dismissFromWatching}
            onToggleWatchlist={toggleWatchlist}
            onToggleFavorite={toggleFavorite}
            onNavigateToDiscover={() => setActiveTab('home')}
            settings={settings}
          />
        )}

        {activeTab === 'lists' && (
          <ListsView
            customLists={customLists}
            mediaItems={mediaItems}
            userStates={userStates}
            onSelectMedia={setSelectedMedia}
            onCreateList={createCustomList}
            onUpdateList={updateCustomList}
            onDeleteList={deleteCustomList}
            onAddItemToList={addItemToList}
            onRemoveItemFromList={removeItemFromList}
            onRandomPick={items => {
              if (items.length > 0) {
                const picked = items[Math.floor(Math.random() * items.length)];
                setRandomModalItem(picked);
              }
            }}
            onRemoveFromWatchlist={removeFromWatchlist}
            onMarkWatching={markWatching}
            onMarkWatched={markWatched}
            onDismissFromWatching={dismissFromWatching}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={updateSettings}
            onDeleteAllData={deleteAllData}
            onRestoreBackup={restoreBackup}
            onClearCachedTitlesAndImages={clearCachedTitlesAndImages}
            onReplayGuide={() => setIsOnboardingOpen(true)}
            mediaItems={mediaItems}
            initialTopic={settingsTopic}
            onRefreshData={refreshLibrary}
          />
        )}
      </main>

      {/* Mobile Floating Pill Bottom Navigation */}
      <BottomNavigation
        activeTab={activeTab}
        onSelectTab={tab => {
          if (tab === 'settings') {
            setSettingsTopic(null);
          }
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        swapSearchAndLists={isSwappedNav}
        onOpenSearch={() => setIsSearchOpen(true)}
        onTriggerSwapConfirm={() => setIsSwapNavConfirmOpen(true)}
      />

      {/* Swap Navigation Layout Confirmation Modal */}
      <SwapNavModal
        isOpen={isSwapNavConfirmOpen}
        onClose={() => setIsSwapNavConfirmOpen(false)}
        onConfirmSwap={handleConfirmSwapNav}
        isCurrentlySwapped={isSwappedNav}
      />

      {/* Offline Toast Indicator */}
      <OfflineToast />

      {/* PWA Application Update Notification */}
      <UpdateNotification
        hasUpdate={hasUpdate}
        isUpdating={isUpdating}
        onUpdate={applyUpdate}
        onDismiss={dismissUpdate}
      />

      {/* Double Back Toast Notification */}
      {backToastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#282C1B] text-[#FAF8F2] text-xs font-semibold shadow-xl border border-white/10 animate-fade-in pointer-events-none">
          {backToastMessage}
        </div>
      )}

      {/* Movie / Series Cinematic Preview Modal */}
      <MoviePreviewModal
        item={selectedMedia}
        isOpen={selectedMedia !== null}
        onClose={() => setSelectedMedia(null)}
        userState={selectedMedia ? userStates[selectedMedia.id] : undefined}
        customLists={customLists}
        backdropOpacity={settings.backdropOpacity}
        onHydrateDetails={hydrateMediaDetails}
        onToggleWatchlist={toggleWatchlist}
        onToggleWatched={toggleWatched}
        onToggleFavorite={toggleFavorite}
        onSetRating={setPersonalRating}
        onSetNotes={setNotes}
        onSetProgress={setProgress}
        onToggleTVEpisode={toggleTVEpisode}
        onToggleSeasonEpisodes={toggleSeasonEpisodes}
        onAddItemToList={addItemToList}
      />

      {/* Universal Search Modal with Plus/Tick Actions */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectMedia={setSelectedMedia}
        localMediaItems={mediaItems}
        tmdbApiKey={settings.tmdbApiKey}
        onAddMediaToLibrary={addMediaToLibrary}
        userStates={userStates}
        onToggleWatchlist={toggleWatchlist}
        onToggleWatched={toggleWatched}
      />

      {/* Random Pick Modal */}
      <RandomModal
        item={randomModalItem}
        isOpen={randomModalItem !== null}
        onClose={() => setRandomModalItem(null)}
        onSelectMedia={setSelectedMedia}
        onPickAnother={handleTriggerRandomGlobal}
        userState={randomModalItem ? userStates[randomModalItem.id] : undefined}
      />

      {/* Global In-App Incoming Transfer Alert (LocalSend Style) */}
      {globalIncomingTransfer && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md p-4 rounded-3xl bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] border border-black/10 dark:border-white/10 shadow-2xl animate-scale-up text-left space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center font-black shrink-0">
                <Wifi className="w-4 h-4 text-[var(--accent-primary)] animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Local Wi-Fi Transfer</div>
                <div className="text-sm font-black truncate">{globalIncomingTransfer.sourceDevice.deviceName}</div>
              </div>
            </div>
            <span className="font-mono text-xs font-black px-2.5 py-1 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] shrink-0">
              {globalIncomingTransfer.summary.totalChanges} changes
            </span>
          </div>

          <p className="text-xs opacity-90 leading-relaxed">
            wants to send {globalIncomingTransfer.summary.totalChanges} library changes ({globalIncomingTransfer.summary.detailPoints.slice(0, 2).join(', ') || 'new items & ratings'}).
          </p>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleGlobalAcceptTransfer}
              className="flex-1 py-2.5 px-3 rounded-xl bg-[var(--accent-primary)] text-[var(--bg-primary)] font-black text-xs transition active:scale-95 shadow-xs flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Accept & Merge</span>
            </button>
            <button
              type="button"
              onClick={handleGlobalDeclineTransfer}
              className="py-2.5 px-3 rounded-xl bg-black/10 dark:bg-white/10 font-bold text-xs transition active:scale-95 hover:bg-black/15"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Sync Success Toast */}
      {syncSuccessToast && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-black shadow-2xl animate-slide-up flex items-center gap-2 border border-white/20">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{syncSuccessToast}</span>
        </div>
      )}

      {/* First Visit Start Guide / Onboarding Flow */}
      <StartGuideModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        onRestoreBackup={restoreBackup}
      />
    </div>
  );
}
