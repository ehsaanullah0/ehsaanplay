import React, { useState } from 'react';
import {
  CustomList,
  MediaItem,
  PersonalMediaState,
  UserSettings,
  GenreCategoryItem,
  GenreMixBottomBarAction,
} from '../../types/movie';
import { ListCoverCollage } from '../common/ListCoverCollage';
import { CreateListModal } from './CreateListModal';
import { ListDetailView } from './ListDetailView';
import { TrendingGenresView } from './TrendingGenresView';
import { GenreTop50DetailView } from './GenreTop50DetailView';
import { SettingsTopicId } from '../settings/SettingsView';
import { findMediaItemByIdOrAlias } from '../../utils/mediaDedup';
import { Plus, Layers, Sparkles } from 'lucide-react';

interface ListsViewProps {
  customLists: CustomList[];
  mediaItems: MediaItem[];
  userStates: Record<string, PersonalMediaState>;
  onSelectMedia: (item: MediaItem) => void;
  onCreateList: (title: string, description?: string, colorTag?: string) => CustomList | void;
  onUpdateList: (id: string, title: string, description?: string, colorTag?: string) => void;
  onDeleteList: (id: string) => void;
  onAddItemToList: (listId: string, mediaId: string, item?: MediaItem) => void;
  onRemoveItemFromList: (listId: string, mediaId: string) => void;
  onRandomPick: (items: MediaItem[]) => void;
  onRemoveFromWatchlist?: (id: string) => void;
  onMarkWatching?: (id: string, item?: MediaItem) => void;
  onMarkWatched?: (id: string, item?: MediaItem) => void;
  onDismissFromWatching?: (id: string) => void;
  onToggleWatchlist?: (id: string, item?: MediaItem) => void;
  onToggleFavorite?: (id: string, item?: MediaItem) => void;
  onAddMediaToLibrary?: (item: MediaItem) => void;
  settings?: UserSettings;
  onUpdateSettings?: (updates: Partial<UserSettings>) => void;
  onGenreMixActionChange?: (action: GenreMixBottomBarAction | null) => void;
  onNavigateToSettingsTopic?: (topic: SettingsTopicId) => void;
  onAutoSaveAiList?: (title: string, description: string, items: MediaItem[]) => void;
  onManualSaveList?: (
    title: string,
    description: string,
    items: MediaItem[],
    isRenamedOrManual: boolean,
    existingListId?: string
  ) => void;
}

export const ListsView: React.FC<ListsViewProps> = ({
  customLists,
  mediaItems,
  userStates,
  onSelectMedia,
  onCreateList,
  onUpdateList,
  onDeleteList,
  onAddItemToList,
  onRemoveItemFromList,
  onRandomPick,
  onRemoveFromWatchlist,
  onMarkWatching,
  onMarkWatched,
  onDismissFromWatching,
  onToggleWatchlist,
  onToggleFavorite,
  onAddMediaToLibrary,
  settings,
  onUpdateSettings,
  onGenreMixActionChange,
  onNavigateToSettingsTopic,
  onAutoSaveAiList,
  onManualSaveList,
}) => {
  // Navigation state within Lists: 'shelves' | 'trending_genres'
  const [activeSubView, setActiveSubView] = useState<'shelves' | 'trending_genres'>('shelves');
  const [activeGenre, setActiveGenre] = useState<GenreCategoryItem | null>(null);
  const [selectedGenreCount, setSelectedGenreCount] = useState<number>(20);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // If a custom shelf list is opened, show its detail view
  const activeList = customLists.find(l => l.id === activeListId);
  if (activeList) {
    return (
      <ListDetailView
        list={activeList}
        allItems={mediaItems}
        userStates={userStates}
        customLists={customLists}
        onBack={() => setActiveListId(null)}
        onSelectMedia={onSelectMedia}
        onUpdateList={onUpdateList}
        onDeleteList={id => {
          onDeleteList(id);
          setActiveListId(null);
        }}
        onAddItemToList={onAddItemToList}
        onRemoveItemFromList={onRemoveItemFromList}
        onRandomPickFromList={onRandomPick}
        onRemoveFromWatchlist={onRemoveFromWatchlist}
        onMarkWatching={onMarkWatching}
        onMarkWatched={onMarkWatched}
        onDismissFromWatching={onDismissFromWatching}
        onToggleWatchlist={onToggleWatchlist}
        onToggleFavorite={onToggleFavorite}
      />
    );
  }

  // If an AI Top Genre is opened, show its detail view
  if (activeSubView === 'trending_genres' && activeGenre) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-28 md:pb-16">
        <GenreTop50DetailView
          genre={activeGenre}
          geminiApiKey={settings?.geminiApiKey}
          geminiModel={settings?.geminiModel || 'gemini-3.1-flash-lite'}
          tmdbApiKey={settings?.tmdbApiKey}
          omdbApiKey={settings?.omdbApiKey}
          initialCount={selectedGenreCount}
          userStates={userStates}
          onBack={() => setActiveGenre(null)}
          onSelectGenre={(genre, count) => {
            if (count) setSelectedGenreCount(count);
            setActiveGenre(genre);
          }}
          onSelectMedia={onSelectMedia}
          onNavigateToGeminiSettings={() => onNavigateToSettingsTopic?.('gemini')}
          onRemoveFromWatchlist={onRemoveFromWatchlist}
          onMarkWatching={onMarkWatching}
          onMarkWatched={onMarkWatched}
          onDismissFromWatching={onDismissFromWatching}
          onToggleWatchlist={onToggleWatchlist}
          onToggleFavorite={onToggleFavorite}
          onAddMediaToLibrary={onAddMediaToLibrary}
          customLists={customLists}
          onAddItemToList={onAddItemToList}
          onRemoveItemFromList={onRemoveItemFromList}
          onAutoSaveAiList={onAutoSaveAiList}
          onManualSaveList={onManualSaveList}
        />
      </div>
    );
  }

  const hasGeminiKey = Boolean(settings?.geminiApiKey && settings.geminiApiKey.trim().length > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-28 md:pb-16 overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
            {activeSubView === 'shelves' ? 'Curation' : 'AI Discovery'}
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight mt-0.5">
            {activeSubView === 'shelves' ? 'Custom Collections' : 'Trending Genres'}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            {activeSubView === 'shelves'
              ? 'Themed personal shelves and playlists'
              : 'Explore curated Top 50 collections across popular genres'}
          </p>
        </div>

        {/* Action Buttons: Create New Shelf & Trending Genres (Placed side-by-side with matching styles) */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          {/* Create New Shelf Button */}
          <button
            onClick={() => {
              if (activeSubView !== 'shelves') {
                setActiveSubView('shelves');
              }
              setIsCreateModalOpen(true);
            }}
            className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition shadow-xs active:scale-95 cursor-pointer ${
              activeSubView === 'shelves'
                ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:opacity-90'
                : 'bg-[var(--chip-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:bg-[var(--border-subtle)]/40'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Create New Shelf</span>
          </button>

          {/* Trending Genres Button */}
          <button
            onClick={() => {
              setActiveSubView(prev => (prev === 'shelves' ? 'trending_genres' : 'shelves'));
              setActiveGenre(null);
            }}
            className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition shadow-xs active:scale-95 cursor-pointer ${
              activeSubView === 'trending_genres'
                ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:opacity-90'
                : 'bg-[var(--chip-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:bg-[var(--border-subtle)]/40'
            }`}
            title="Browse AI-Curated Top 50 Genre Collections"
          >
            <Sparkles className="w-4 h-4 fill-current text-amber-300" />
            <span>Trending Genres</span>
          </button>
        </div>
      </div>

      {/* Main Content Area with Smooth Horizontal Slide Transition */}
      <div className="relative">
        {/* View 1: Custom Shelves */}
        {activeSubView === 'shelves' && (
          <div className="animate-fade-in transition-all duration-300">
            {customLists.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {customLists.map(list => {
                  const seenIds = new Set<string>();
                  const itemsInList: MediaItem[] = [];
                  for (const id of list.itemIds) {
                    const resolved = findMediaItemByIdOrAlias(id, mediaItems);
                    if (resolved && !seenIds.has(resolved.id)) {
                      seenIds.add(resolved.id);
                      itemsInList.push(resolved);
                    }
                  }

                  return (
                    <div
                      key={list.id}
                      onClick={() => setActiveListId(list.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setActiveListId(list.id);
                        }
                      }}
                      className="group flex items-center gap-4 sm:gap-5 p-4 sm:p-5 rounded-3xl bg-[var(--bg-surface-card)] hover:opacity-90 transition-all duration-200 cursor-pointer border border-[var(--border-subtle)] shadow-xs hover:shadow-md focus:outline-none"
                    >
                      {/* 4-Poster dynamic collage */}
                      <div className="flex-none">
                        <ListCoverCollage items={itemsInList} size="md" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
                            {list.title}
                          </h3>
                          {list.isAiGenerated && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-500 border border-amber-400/30 shrink-0">
                              <Sparkles className="w-2.5 h-2.5 fill-current" />
                              AI
                            </span>
                          )}
                        </div>
                        {list.description && (
                          <p className="mt-1 text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                            {list.description}
                          </p>
                        )}
                        <div className="mt-2 text-xs font-semibold text-[var(--accent-primary)]">
                          {itemsInList.length} {itemsInList.length === 1 ? 'title' : 'titles'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-sm mx-auto">
                <div className="w-16 h-16 rounded-3xl bg-[var(--accent-secondary)] text-[var(--accent-secondary-text)] flex items-center justify-center mb-4 border border-[var(--border-subtle)] shadow-xs">
                  <Layers className="w-7 h-7 stroke-[2]" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  Make your own little shelf.
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                  Create a list for whatever you’re in the mood for — comfort rewatches, director retrospectives, or rainy day picks.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-6 py-2.5 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-90 transition shadow-xs active:scale-95 cursor-pointer"
                  >
                    Create Your First List
                  </button>
                  <button
                    onClick={() => setActiveSubView('trending_genres')}
                    className="px-5 py-2.5 rounded-full bg-[var(--chip-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-bold hover:bg-[var(--border-subtle)]/40 transition shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-current" />
                    <span>Explore Trending Genres</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* View 2: Trending Genres Discovery Screen (No automatic generation on mount) */}
        {activeSubView === 'trending_genres' && (
          <div className="animate-fade-in transition-all duration-300">
            <TrendingGenresView
              onSelectGenre={(genre, count) => {
                if (count) setSelectedGenreCount(count);
                setActiveGenre(genre);
              }}
              hasGeminiKey={hasGeminiKey}
              selectedModel={settings?.geminiModel || 'gemini-3.1-flash-lite'}
              onUpdateModel={modelId => onUpdateSettings?.({ geminiModel: modelId })}
              onGenreMixActionChange={onGenreMixActionChange}
              onNavigateToGeminiSettings={() => onNavigateToSettingsTopic?.('gemini')}
              onBackToShelves={() => {
                onGenreMixActionChange?.(null);
                setActiveSubView('shelves');
              }}
            />
          </div>
        )}
      </div>

      {/* Create List Modal */}
      <CreateListModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={onCreateList}
      />
    </div>
  );
};
