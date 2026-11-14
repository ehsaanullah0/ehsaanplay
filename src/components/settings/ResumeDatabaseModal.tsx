import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  PlayCircle,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldAlert,
  Clock,
  Copy,
  Check,
  Smartphone,
  Laptop,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  extractSupabaseProjectRef,
  getSupabaseDashboardUrl,
  SupabaseVerificationStatus,
} from '../../services/supabase/config';
import { testSupabaseConnection } from '../../services/supabase/verification';

interface ResumeDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectUrl: string;
  publishableKey: string;
  onConnectionRestored?: (status: SupabaseVerificationStatus) => void;
}

export const ResumeDatabaseModal: React.FC<ResumeDatabaseModalProps> = ({
  isOpen,
  onClose,
  projectUrl,
  publishableKey,
  onConnectionRestored,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isRestored, setIsRestored] = useState(false);
  const [lastCheckMessage, setLastCheckMessage] = useState<string | null>(null);
  const [checkCount, setCheckCount] = useState(0);
  const [copiedRef, setCopiedRef] = useState(false);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const projectRef = extractSupabaseProjectRef(projectUrl);
  const dashboardUrl = getSupabaseDashboardUrl(projectUrl);

  const copyRefToClipboard = () => {
    if (!projectRef) return;
    navigator.clipboard.writeText(projectRef).then(() => {
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    });
  };

  const performCheck = useCallback(async () => {
    if (!projectUrl || !publishableKey) return;
    setIsChecking(true);
    setCheckCount(prev => prev + 1);

    try {
      const res = await testSupabaseConnection(projectUrl, publishableKey);
      if (res.reachable) {
        setIsRestored(true);
        setLastCheckMessage('Project is active and reconnected!');
        if (onConnectionRestored) {
          onConnectionRestored(res);
        }
        // Auto close after 2.2 seconds
        autoCloseTimerRef.current = setTimeout(() => {
          onClose();
        }, 2200);
      } else {
        setIsRestored(false);
        setLastCheckMessage(
          res.isPaused
            ? 'Project is still booting or paused. Supabase typically takes 1–2 minutes to resume.'
            : res.errorMessage || 'Database endpoint not yet responsive.'
        );
      }
    } catch (err) {
      setIsRestored(false);
      setLastCheckMessage(err instanceof Error ? err.message : 'Connection check failed.');
    } finally {
      setIsChecking(false);
    }
  }, [projectUrl, publishableKey, onConnectionRestored, onClose]);

  // Auto-recheck listener: automatically triggers when window receives focus or visibility changes
  useEffect(() => {
    if (!isOpen || isRestored) return;

    const handleWindowFocus = () => {
      performCheck();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        performCheck();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, [isOpen, isRestored, performCheck]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in text-[var(--text-primary)]"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-[var(--modal-bg)] text-[var(--text-primary)] rounded-3xl sm:rounded-[32px] shadow-2xl border border-[var(--border-subtle)] overflow-hidden text-left animate-scale-up"
      >
        {/* Sticky Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0 bg-[var(--modal-bg)]/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
              <PlayCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-[var(--text-primary)] truncate">
                Resume Paused Database
              </h3>
              <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] truncate">
                Restore your free-tier Supabase project from sleep
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--chip-bg)] transition cursor-pointer shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 no-scrollbar">
          {/* Why Paused Callout */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 text-amber-950 dark:text-amber-100 text-xs space-y-1.5 shadow-2xs">
            <div className="font-bold flex items-center gap-1.5 text-amber-950 dark:text-amber-100 text-xs sm:text-sm">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Database Paused (7+ Days Inactivity)</span>
            </div>
            <p className="text-[11px] sm:text-xs leading-relaxed text-amber-900 dark:text-amber-200">
              Supabase automatically pauses free-tier database instances after <strong>7 days of inactivity</strong> to conserve cloud compute power.
              All your stored movies, ratings, watch progress, and custom shelves remain <strong>100% safe and intact</strong>.
            </p>
          </div>

          {/* Connected Project Identifier Card */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                Target Connected Project
              </span>
              <div className="font-mono font-bold text-xs sm:text-sm text-[var(--text-primary)] truncate">
                {projectRef ? projectRef : 'Project Reference Not Detected'}
              </div>
            </div>

            {projectRef && (
              <button
                type="button"
                onClick={copyRefToClipboard}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-surface-elevated)] hover:bg-[var(--modal-bg)] text-[var(--text-primary)] text-[11px] font-bold border border-[var(--border-subtle)] transition active:scale-95 cursor-pointer shrink-0 self-start sm:self-center"
              >
                {copiedRef ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied ID</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    <span>Copy Project ID</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Step-by-Step Directions */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-[var(--text-secondary)]">
                Step-by-Step Restoration Directions
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-600 text-white shadow-xs">
                Takes ~1–2 Minutes
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Step 1 */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-2">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-black flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    1
                  </span>
                  <div className="space-y-1 text-xs flex-1 min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-[var(--text-primary)]">
                      Open your Supabase Project Console
                    </div>
                    <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] leading-relaxed">
                      Tap or click the button below to open your Supabase project in a new browser tab.
                    </p>
                  </div>
                </div>

                <div className="pt-1 pl-9">
                  <a
                    href={dashboardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold transition active:scale-95 shadow-xs"
                  >
                    <span>Open Supabase Project Dashboard</span>
                    <ExternalLink className="w-3.5 h-3.5 text-white" />
                  </a>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[var(--chip-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div className="space-y-1.5 text-xs flex-1 min-w-0">
                  <div className="font-bold text-xs sm:text-sm text-[var(--text-primary)]">
                    Find and click "Resume Project"
                  </div>
                  <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] leading-relaxed">
                    Look for the yellow alert banner across the top of your Supabase dashboard:
                  </p>
                  {/* Visual simulation banner */}
                  <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-[11px] font-mono text-amber-950 dark:text-amber-100 flex items-center justify-between gap-2 overflow-x-auto">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="truncate">Project is paused due to inactivity</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-600 text-white font-sans text-[10px] font-bold shrink-0">
                      Resume project
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[var(--chip-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div className="space-y-1 text-xs flex-1 min-w-0">
                  <div className="font-bold text-xs sm:text-sm text-[var(--text-primary)]">
                    Wait for Cloud Re-provisioning
                  </div>
                  <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] leading-relaxed">
                    Supabase takes approximately <strong>60 to 90 seconds</strong> to boot up the PostgreSQL container.
                    The banner will show <em>"Restoring project"</em> and then disappear or turn green when ready.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[var(--chip-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  4
                </span>
                <div className="space-y-1 text-xs flex-1 min-w-0">
                  <div className="font-bold text-xs sm:text-sm text-[var(--text-primary)]">
                    Switch back to EhsaanPlay
                  </div>
                  <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] leading-relaxed">
                    Return to this window. EhsaanPlay will automatically detect when the project is active and re-establish live synchronization.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Device Responsive Tip */}
          <div className="p-3 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] flex items-start gap-2.5">
            <Smartphone className="w-4 h-4 text-[var(--accent-primary)] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Device Tip:</strong> On phones or tablets, clicking the dashboard button switches to your browser. Once you tap "Resume" in Supabase, switch back to this tab and EhsaanPlay will automatically reconnect.
            </p>
          </div>

          {/* Live Auto-Recheck Status Card */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isRestored ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      isRestored ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                </span>
                <span className="font-bold text-[var(--text-primary)] truncate text-xs sm:text-sm">
                  {isRestored
                    ? 'Database Restored & Online!'
                    : isChecking
                    ? 'Checking database reachability...'
                    : 'Auto-detection listener active'}
                </span>
              </div>

              {checkCount > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] shrink-0">
                  Checks: {checkCount}
                </span>
              )}
            </div>

            <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] leading-relaxed">
              {isRestored ? (
                <span className="text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  Connection successfully re-established! Closing dialog...
                </span>
              ) : lastCheckMessage ? (
                lastCheckMessage
              ) : (
                'Listening for wake-up... Automatically verifying when you return to this window.'
              )}
            </p>
          </div>

          {/* Authorization Notice */}
          <div className="p-3 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[10px] sm:text-[11px] space-y-1 text-[var(--text-secondary)]">
            <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>Why is manual dashboard authorization required?</span>
            </div>
            <p className="leading-relaxed">
              EhsaanPlay only stores your client-side <strong>Publishable Key</strong>, which strictly lacks cloud infrastructure management privileges. Resuming an inactive compute server requires project-owner authorization directly in the Supabase console.
            </p>
          </div>
        </div>

        {/* Sticky Footer Action Bar */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-[var(--border-subtle)] bg-[var(--modal-bg)]/95 backdrop-blur-xs shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 z-10">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-[var(--chip-bg)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] text-xs font-bold border border-[var(--border-subtle)] transition active:scale-95 cursor-pointer text-center"
          >
            Dismiss
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <a
              href={dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-2xl bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white text-xs font-bold transition active:scale-95 shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>Open Supabase</span>
              <ExternalLink className="w-3.5 h-3.5 text-white" />
            </a>

            <button
              type="button"
              onClick={performCheck}
              disabled={isChecking}
              className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-black hover:opacity-90 active:scale-95 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Checking...' : 'Check Status Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
