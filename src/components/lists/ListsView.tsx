import React, { useState } from 'react';
import { CustomList, MediaItem, PersonalMediaState } from '../../types/movie';
import { ListCoverCollage } from '../common/ListCoverCollage';
import { CreateListModal } from './CreateListModal';
import { ListDetailView } from './ListDetailView';
import { Plus, Layers } from 'lucide-react';

interface ListsViewProps {
  customLists: CustomList[];
  mediaItems: MediaItem[];
  userStates: Record<string, PersonalMediaState>;
  onSelectMedia: (item: MediaItem) => void;
  onCreateList: (title: string, description?: string, colorTag?: string) => void;
  onUpdateList: (id: string, title: string, description?: string, colorTag?: string) => void;
  onDeleteList: (id: string) => void;
  onAddItemToList: (listId: string, mediaId: string) => void;
  onRemoveItemFromList: (listId: string, mediaId: string) => void;
  onRandomPick: (items: MediaItem[]) => void;
  onRemoveFromWatchlist?: (id: string) => void;
  onMarkWatching?: (id: string) => void;
  onMarkWatched?: (id: string) => void;
  onDismissFromWatching?: (id: string) => void;
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
}) => {
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // If a list is selected, open the detailed view
  const activeList = customLists.find(l => l.id === activeListId);
  if (activeList) {
    return (
      <ListDetailView
        list={activeList}
        allItems={mediaItems}
        userStates={userStates}
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
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-28 md:pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
            Curation
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight mt-0.5">
            Custom Collections
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Themed personal shelves and playlists
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs sm:text-sm font-bold hover:opacity-90 transition shadow-xs self-start sm:self-auto active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Shelf</span>
        </button>
      </div>

      {/* Lists Grid */}
      {customLists.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {customLists.map(list => {
            const itemsInList = list.itemIds
              .map(id => mediaItems.find(m => m.id === id))
              .filter((m): m is MediaItem => m !== undefined);

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
                  <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-primary)] transition-colors">
                    {list.title}
                  </h3>
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
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-6 px-6 py-2.5 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-90 transition shadow-xs active:scale-95"
          >
            Create Your First List
          </button>
        </div>
      )}

      {/* Create List Modal */}
      <CreateListModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={onCreateList}
      />
    </div>
  );
};
