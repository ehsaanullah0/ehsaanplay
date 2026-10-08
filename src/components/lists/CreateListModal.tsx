import React, { useState, useEffect } from 'react';
import { CustomList } from '../../types/movie';
import { X, Plus } from 'lucide-react';

interface CreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, description?: string, colorTag?: string) => void;
  editingList?: CustomList | null;
}

export const CreateListModal: React.FC<CreateListModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingList,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [colorTag, setColorTag] = useState('#FFB084');

  // Sync state whenever modal opens or target collection changes
  useEffect(() => {
    if (isOpen) {
      if (editingList) {
        setTitle(editingList.title || '');
        setDescription(editingList.description || '');
        setColorTag(editingList.colorTag || '#FFB084');
      } else {
        setTitle('');
        setDescription('');
        setColorTag('#FFB084');
      }
    }
  }, [isOpen, editingList]);

  if (!isOpen) return null;

  const colorPalette = [
    '#FFB084', // Warm Peach / Orange
    '#7C4022', // Deep Terracotta
    '#F4DF77', // Butter Yellow
    '#ADC8FA', // Sky / Periwinkle Blue
    '#2B447A', // Deep Navy Blue
    '#DCC6FA', // Soft Lavender
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit(title.trim(), description.trim() || undefined, colorTag);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[var(--modal-bg)] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[var(--border-subtle)] text-[var(--text-primary)] z-10">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
          <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            {editingList ? 'Edit Collection' : 'New Collection'}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-full bg-[var(--chip-bg)] hover:opacity-85 text-[var(--text-primary)] transition focus:outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
              Collection Title *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Rainy Day Comfort, Nolan Marathon..."
              className="w-full px-4 py-2.5 rounded-2xl bg-[var(--chip-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What makes this collection special?"
              className="w-full px-4 py-2.5 rounded-2xl bg-[var(--chip-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
              Accent Color
            </label>
            <div className="flex items-center gap-2">
              {colorPalette.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColorTag(c)}
                  style={{ backgroundColor: c }}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    colorTag === c ? 'ring-2 ring-offset-2 ring-[var(--accent-primary)] scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-90 disabled:opacity-50 transition shadow-xs active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{editingList ? 'Save Changes' : 'Create Shelf'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
