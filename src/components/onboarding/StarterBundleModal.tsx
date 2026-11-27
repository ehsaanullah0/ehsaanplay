import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImportResult } from '../../services/storage';
import {
  Download,
  Upload,
  FileJson,
  Sparkles,
  X,
  Check,
  FolderArchive,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const STARTER_BUNDLE_SEEN_KEY = 'ehsaan_starter_bundle_popup_seen_v1';

const BUNDLE_LIBRARY_URL =
  'https://github.com/ehsaanullah0/ehsaanplay/releases/download/v2.4.1/ehsaan-play-360.json';
const BUNDLE_ICONS_URL =
  'https://github.com/ehsaanullah0/ehsaanplay/releases/download/V2.3.6/light-icos.zip';

interface StarterBundleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreBackup: (json: string) => ImportResult | boolean;
}

/**
 * Clean, minimal, theme-adaptive popup displayed once after entering the Home
 * page for the first time (separate from the Start Guide). Proposes downloading
 * Ehsaanullah's 360+ movies & series JSON library bundle (with 1-tap conversion
 * into an Import action after download) and custom light PWA logos.
 * Closes strictly via the filled red circular cross button in the top corner.
 */
export const StarterBundleModal: React.FC<StarterBundleModalProps> = ({
  isOpen,
  onClose,
  onRestoreBackup,
}) => {
  const [downloadedItems, setDownloadedItems] = useState<{
    library: boolean;
    icons: boolean;
  }>({ library: false, icons: false });
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsImporting(true);
    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== 'string' || !text.trim()) {
          setImportStatus({
            success: false,
            message: 'Selected file is empty or unreadable.',
          });
          setIsImporting(false);
          return;
        }

        const result = onRestoreBackup(text);
        if (typeof result === 'object' ? result.success : Boolean(result)) {
          const counts =
            typeof result === 'object' && result.restoredCounts
              ? `Restored ${result.restoredCounts.mediaCount} titles & ${result.restoredCounts.listsCount} lists!`
              : typeof result === 'object' && result.message
              ? result.message
              : 'Library bundle imported successfully!';
          setImportStatus({
            success: true,
            message: counts,
          });
        } else {
          setImportStatus({
            success: false,
            message:
              typeof result === 'object' && result.message
                ? result.message
                : 'Invalid JSON backup file. Please verify the file.',
          });
        }
      } catch {
        setImportStatus({
          success: false,
          message: 'Failed to read the selected JSON file.',
        });
      } finally {
        setIsImporting(false);
      }
    };

    reader.onerror = () => {
      setImportStatus({
        success: false,
        message: 'Could not read the selected file.',
      });
      setIsImporting(false);
    };

    reader.readAsText(file);
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="starter-bundle-title"
      className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md sm:max-w-lg rounded-3xl bg-[var(--modal-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-2xl overflow-hidden animate-scale-up"
      >
        <div className="p-5 sm:p-6">
          {/* Header Row with Filled Red Circular Cross Button at Top Corner */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[var(--text-secondary)]">
                Optional Starter Bundle
              </div>
              <h2
                id="starter-bundle-title"
                className="mt-1 text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--text-primary)] text-balance"
              >
                Ehsaanullah&apos;s Curated Extras
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close starter bundle popup"
              title="Close"
              className="w-9 h-9 rounded-full bg-red-600 hover:bg-red-700 text-white border border-red-700 shadow-sm flex items-center justify-center transition active:scale-95 shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              <X className="w-4 h-4 stroke-[2.6]" />
            </button>
          </div>

          <p className="mt-2.5 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            Want a head start? Download Ehsaanullah&apos;s 360+ movie &amp; series library backup or the custom light PWA icon pack directly from GitHub Releases.
          </p>

          {/* Clean Hairline-Separated Download / Import Rows */}
          <div className="mt-5 rounded-2xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] overflow-hidden">
            {/* 1. 360+ Movies & Series JSON (Switches to Direct Import after Download) */}
            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] flex items-center justify-center shrink-0 mt-0.5 ui-float-gentle">
                  <FileJson className="w-4.5 h-4.5 stroke-[2.2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-[var(--text-primary)] leading-snug">
                    360+ Movies &amp; Series Bundle
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[var(--text-secondary)]">
                    <span className="font-mono text-[11px] break-all">ehsaan-play-360.json</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {importStatus?.success
                        ? 'Imported into library'
                        : downloadedItems.library
                        ? 'Select file to import'
                        : 'Ready to import'}
                    </span>
                  </div>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportFileChange}
                className="hidden"
                aria-hidden="true"
              />

              {downloadedItems.library ? (
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[44px] rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-92 active:scale-95 transition shadow-xs whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2"
                >
                  {importStatus?.success ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[2.6]" />
                      <span>Imported</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 stroke-[2.4]" />
                      <span>{isImporting ? 'Importing...' : 'Import'}</span>
                    </>
                  )}
                </button>
              ) : (
                <a
                  href={BUNDLE_LIBRARY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  download="ehsaan-play-360.json"
                  onClick={() =>
                    setDownloadedItems((prev) => ({ ...prev, library: true }))
                  }
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[44px] rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-92 active:scale-95 transition shadow-xs whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2"
                >
                  <Download className="w-3.5 h-3.5 stroke-[2.4]" />
                  <span>Download</span>
                </a>
              )}
            </div>

            {/* 2. Custom Light App PWA Logos (Secondary Theme Color Button) */}
            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-card-yellow)] text-[var(--text-card-yellow)] flex items-center justify-center shrink-0 mt-0.5 ui-float-gentle">
                  <FolderArchive className="w-4.5 h-4.5 stroke-[2.2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-[var(--text-primary)] leading-snug">
                    Custom Light App PWA Logos
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[var(--text-secondary)]">
                    <span className="font-mono text-[11px] break-all">light-icos.zip</span>
                    <span aria-hidden="true">·</span>
                    <span>Light icon pack</span>
                  </div>
                </div>
              </div>

              <a
                href={BUNDLE_ICONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                download="light-icos.zip"
                onClick={() =>
                  setDownloadedItems((prev) => ({ ...prev, icons: true }))
                }
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[44px] rounded-full bg-[var(--accent-secondary)] text-[var(--accent-secondary-text)] border border-[var(--border-subtle)] text-xs font-bold hover:opacity-90 active:scale-95 transition shadow-xs whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2"
              >
                {downloadedItems.icons ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.6]" />
                    <span>Started</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 stroke-[2.4]" />
                    <span>Download</span>
                  </>
                )}
              </a>
            </div>
          </div>

          {/* Direct JSON Import Result Feedback */}
          {importStatus && (
            <div
              className={`mt-3.5 p-3 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
                importStatus.success
                  ? 'bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] border-[var(--border-subtle)]'
                  : 'bg-[var(--bg-surface-elevated)] text-red-500 border-red-500/30'
              }`}
            >
              {importStatus.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{importStatus.message}</span>
            </div>
          )}

          {/* Subtle Import Tip */}
          <div className="mt-3.5 flex items-start sm:items-center gap-2 text-[11px] text-[var(--text-secondary)] leading-relaxed">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0 mt-0.5 sm:mt-0 ui-sparkle-alive" />
            <span>
              {downloadedItems.library
                ? 'Click Import above to load your downloaded ehsaan-play-360.json file immediately.'
                : 'After downloading, click Import right here or load anytime via Settings → Backup & Restore.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
