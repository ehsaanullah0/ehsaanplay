import React, { useState } from 'react';
import { CustomList, MediaItem, PersonalMediaState } from '../../types/movie';
import { ListCoverCollage } from '../common/ListCoverCollage';
import { MoviePoster } from '../common/MoviePoster';
import { CreateListModal } from './CreateListModal';
import {
  ArrowLeft,
  Sparkles,
  Edit2,
  Trash2,
  Plus,
  X,
  Search,
} from 'lucide-react';

interface ListDetailViewProps {
  list: CustomList;
  allItems: MediaItem[];
  userStates: Record<string, PersonalMediaState>;
  onBack: () => void;
  onSelectMedia: (item: MediaItem) => void;
  onUpdateList: (id: string, title: string, description?: string, colorTag?: string) => void;
  onDeleteList: (id: string) => void;
  onAddItemToList: (listId: string, mediaId: string) => void;
  onRemoveItemFromList: (listId: string, mediaId: string) => void;
  onRandomPickFromList: (items: MediaItem[]) => void;
  onRemoveFromWatchlist?: (id: string) => void;
  onMarkWatching?: (id: string) => void;
  onMarkWatched?: (id: string) => void;
}

export const ListDetailView: React.FC<ListDetailViewProps> = ({
  list,
  allItems,
  userStates,
  onBack,
  onSelectMedia,
  onUpdateList,
  onDeleteList,
  onAddItemToList,
  onRemoveItemFromList,
  onRandomPickFromList,
  onRemoveFromWatchlist,
  onMarkWatching,
  onMarkWatched,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddMediaOpen, setIsAddMediaOpen] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');

  // Get items belonging to this list
  const listItems = list.itemIds
    .map(id => allItems.find(item => item.id === id))
    .filter((item): item is MediaItem => item !== undefined);

  // Available items not yet in this list
  const availableToAdd = allItems.filter(
    item =>
      !list.itemIds.includes(item.id) &&
      (addSearchQuery.trim() === '' ||
        item.title.toLowerCase().includes(addSearchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-28 md:pb-16">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FEDB99] hover:opacity-90 text-[#624B15] text-xs sm:text-sm font-bold mb-6 sm:mb-8 transition group shadow-3xs border border-[#624B15]/10"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-[#624B15]" />
        <span>Back to All Collections</span>
      </button>

      {/* Playlist Hero Section */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8 bg-[#F3EFE4] p-6 sm:p-8 rounded-3xl border border-[#4E562F]/10 mb-10">
        {/* Dynamic Collage Cover */}
        <ListCoverCollage items={listItems} size="lg" className="shadow-md" />

        <div className="flex-1 text-center md:text-left flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#6A7056]">
              Custom Collection
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#282C1B] tracking-tight mt-1">
              {list.title}
            </h1>
            {list.description && (
              <p className="mt-2 text-sm sm:text-base text-[#6A7056] leading-relaxed max-w-2xl">
                {list.description}
              </p>
            )}
            <div className="mt-3 text-xs text-[#6A7056] flex items-center justify-center md:justify-start gap-2">
              <span className="font-semibold text-[#282C1B]">
                {listItems.length} {listItems.length === 1 ? 'title' : 'titles'}
              </span>
              <span aria-hidden="true">·</span>
              <span>Updated {new Date(list.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-center md:justify-start gap-2.5">
            <button
              onClick={() => setIsAddMediaOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#4E562F] text-[#FAF8F2] text-xs font-bold hover:bg-[#3E4524] transition shadow-xs active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Movies & Series</span>
            </button>

            {listItems.length > 0 && (
              <button
                onClick={() => onRandomPickFromList(listItems)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#E4EAB8] text-[#3B421E] text-xs font-bold hover:bg-[#D7DE9E] transition active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Shuffle Pick</span>
              </button>
            )}

            <button
              onClick={() => setIsEditModalOpen(true)}
              className="p-2.5 rounded-full bg-[#FEDB99] hover:opacity-90 text-[#624B15] transition border border-[#624B15]/15 active:scale-95 shadow-3xs"
              title="Edit List Details"
            >
              <Edit2 className="w-4 h-4 text-[#624B15]" />
            </button>

            <button
              onClick={() => {
                if (window.confirm(`Delete collection "${list.title}"?`)) {
                  onDeleteList(list.id);
                  onBack();
                }
              }}
              className="p-2.5 rounded-full bg-[#FAF8F2] hover:bg-rose-50 text-rose-600 transition border border-rose-200/50 active:scale-95"
              title="Delete Collection"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Media Grid */}
      {listItems.length > 0 ? (
        <div>
          <h2 className="text-xl font-bold text-[#282C1B] mb-5 tracking-tight">
            Titles in this Collection
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {listItems.map(item => (
              <div key={item.id} className="relative group">
                <MoviePoster
                  item={item}
                  userState={userStates[item.id]}
                  onClick={() => onSelectMedia(item)}
                  onRemoveFromWatchlist={onRemoveFromWatchlist}
                  onMarkWatching={onMarkWatching}
                  onMarkWatched={onMarkWatched}
                />
                {/* Remove from list quick trigger */}
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onRemoveItemFromList(list.id, item.id);
                  }}
                  className="absolute top-2.5 left-2.5 p-1.5 rounded-full bg-black/60 text-white hover:bg-rose-600 transition opacity-0 group-hover:opacity-100 z-10"
                  title="Remove from list"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 px-4 max-w-sm mx-auto">
          <p className="text-sm text-[#6A7056] leading-relaxed">
            This collection is empty right now. Add titles from your library to start building your shelf.
          </p>
          <button
            onClick={() => setIsAddMediaOpen(true)}
            className="mt-4 px-5 py-2.5 rounded-full bg-[#4E562F] text-[#FAF8F2] text-xs font-bold hover:bg-[#3E4524] transition shadow-xs"
          >
            Browse & Add Titles
          </button>
        </div>
      )}

      {/* Add Media Drawer / Modal */}
      {isAddMediaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="absolute inset-0" onClick={() => setIsAddMediaOpen(false)} />
          <div className="relative w-full max-w-lg max-h-[80vh] flex flex-col bg-[#FAF8F2] rounded-3xl p-6 shadow-2xl border border-[#4E562F]/15 text-[#282C1B] z-10">
            <div className="flex items-center justify-between pb-4 border-b border-[#4E562F]/10">
              <h3 className="text-lg font-bold">Add to {list.title}</h3>
              <button
                onClick={() => setIsAddMediaOpen(false)}
                className="p-2 rounded-full bg-[#EFECE1] hover:bg-[#E5E1D3] text-[#4E562F] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-3 relative">
              <Search className="w-4 h-4 text-[#748547] absolute left-3 top-1/2 -translate-y-1/2 stroke-[2.5]" />
              <input
                type="text"
                value={addSearchQuery}
                onChange={e => setAddSearchQuery(e.target.value)}
                placeholder="Search library to add..."
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-[#EFECE1] text-[#282C1B] placeholder-[#8C9277] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#4E562F]"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2">
              {availableToAdd.length > 0 ? (
                availableToAdd.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-[#F3EFE4] hover:bg-[#EBE7DC] transition"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={item.posterUrl}
                        alt={item.title}
                        className="w-10 h-14 object-cover rounded-lg bg-[#EAE7DC]"
                      />
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-[#282C1B]">
                          {item.title}
                        </h4>
                        <span className="text-[11px] text-[#6A7056]">
                          {item.year} · {item.type === 'tv' ? 'Series' : 'Movie'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onAddItemToList(list.id, item.id)}
                      className="p-2 rounded-full bg-[#4E562F] text-[#FAF8F2] hover:bg-[#3E4524] transition shadow-xs active:scale-95"
                      title="Add title"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-center py-8 text-xs text-[#6A7056]">
                  No additional titles found.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit List Modal */}
      <CreateListModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        editingList={list}
        onSubmit={(title, desc, color) => onUpdateList(list.id, title, desc, color)}
      />
    </div>
  );
};
