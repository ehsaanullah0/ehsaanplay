import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  PlayCircle,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  Check,
  Smartphone,
  Laptop,
  ArrowLeft,
  ShieldAlert,
  Database,
  ArrowRight,
  Info,
  Server,
  Cloud,
  CheckSquare,
} from 'lucide-react';
import {
  extractSupabaseProjectRef,
  getSupabaseDashboardUrl,
  loadSupabaseConfig,
  SupabaseVerificationStatus,
} from '../../services/supabase/config';
import { testSupabaseConnection } from '../../services/supabase/verification';

export interface ResumeDatabaseViewProps {
  projectUrl?: string;
  publishableKey?: string;
  onBack?: () => void;
  onConnectionRestored?: (status: SupabaseVerificationStatus) => void;
  onRefreshData?: () => void;
  isSubpage?: boolean;
}

export const ResumeDatabaseView: React.FC<ResumeDatabaseViewProps> = ({
  projectUrl: propUrl,
  publishableKey: propKey,
  onBack,
  onConnectionRestored,
  onRefreshData,
  isSubpage = false,
}) => {
  // Fallback to loaded config if not explicitly passed as props
  const [config] = useState(() => loadSupabaseConfig());
  const projectUrl = propUrl || config?.url || '';
  const publishableKey = propKey || config?.publishableKey || '';

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
    if (!projectUrl || !publishableKey) {
      setLastCheckMessage('No Supabase credentials configured. Please connect a project first.');
      return;
    }
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
        if (onRefreshData) {
          onRefreshData();
        }
      } else {
        setIsRestored(false);
        setLastCheckMessage(
          res.isPaused
            ? 'Project is still booting or paused. Supabase typically takes 1–2 minutes to finish resuming.'
            : res.errorMessage || 'Database endpoint not yet responsive.'
        );
      }
    } catch (err) {
      setIsRestored(false);
      setLastCheckMessage(err instanceof Error ? err.message : 'Connection check failed.');
    } finally {
      setIsChecking(false);
    }
  }, [projectUrl, publishableKey, onConnectionRestored, onRefreshData]);

  // Initial check on mount
  useEffect(() => {
    if (projectUrl && publishableKey) {
      performCheck();
    }
  }, [projectUrl, publishableKey, performCheck]);

  // Auto-recheck listener: automatically triggers when window receives focus or visibility changes
  useEffect(() => {
    if (isRestored) return;

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
  }, [isRestored, performCheck]);

  return (
    <div className="w-full space-y-5 animate-fade-in text-[var(--text-primary)]">
      {/* Top Navigation & Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to Cloud Database & Sync"
              className="w-10 h-10 rounded-2xl bg-[var(--chip-bg)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] flex items-center justify-center transition active:scale-95 shadow-2xs hover:scale-105 cursor-pointer shrink-0"
              title="Back to Cloud Database & Sync"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              <span>Settings</span>
              <span>/</span>
              <span>Cloud Database</span>
              <span>/</span>
              <span className="text-amber-600 dark:text-amber-400 font-extrabold">Resume Database</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight mt-0.5 truncate flex items-center gap-2.5">
              <span>Resume Paused Database</span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  isRestored
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : isChecking
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 animate-pulse'
                    : 'bg-amber-600 text-white border-transparent'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isRestored ? 'bg-emerald-500' : isChecking ? 'bg-amber-500 animate-ping' : 'bg-white'
                  }`}
                />
                <span>{isRestored ? 'Online' : isChecking ? 'Checking...' : 'Paused'}</span>
              </span>
            </h1>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
          >
            <span>Open Supabase</span>
            <ExternalLink className="w-3.5 h-3.5 text-white" />
          </a>

          <button
            type="button"
            onClick={performCheck}
            disabled={isChecking}
            className="px-3.5 py-2 rounded-xl bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-black transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer hover:opacity-90"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Verifying...' : 'Check Status'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Fully Adaptive for Mobile, Tablet, and Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (Desktop 7 cols, Tablet/Mobile 12 cols): Instructions & Visual Walkthrough */}
        <div className="lg:col-span-7 space-y-4">
          {/* Why Paused Explanatory Banner */}
          <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/15 dark:bg-amber-950/40 border-2 border-amber-600/40 space-y-2.5 shadow-2xs">
            <div className="font-black flex items-center gap-2 text-sm sm:text-base text-[#3f1d0b] dark:text-[#fef3c7]">
              <Clock className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0" />
              <span>Free-Tier Inactivity Auto-Pause</span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-[#451a03] dark:text-[#fde68a] font-medium">
              Supabase automatically pauses free-tier database instances after <strong className="text-[#290e03] dark:text-white font-extrabold underline underline-offset-2 decoration-amber-500/60">7 days of inactivity</strong> to conserve cloud compute power.
            </p>
            <div className="pt-1 flex items-center gap-2 text-xs font-bold text-[#14532d] dark:text-[#bbf7d0] bg-emerald-500/20 dark:bg-emerald-950/50 px-3 py-2 rounded-xl border border-emerald-600/40">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <span>All your movies, watch history, ratings, and custom shelves are 100% safe and preserved.</span>
            </div>
          </div>

          {/* Connected Project Identifier Card */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                Target Connected Project
              </span>
              {projectRef && (
                <button
                  type="button"
                  onClick={copyRefToClipboard}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--chip-bg)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] text-xs font-bold border border-[var(--border-subtle)] transition active:scale-95 cursor-pointer"
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

            <div className="p-3 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] space-y-1">
              <div className="font-mono font-bold text-sm sm:text-base text-[var(--text-primary)] break-all">
                {projectRef ? projectRef : 'Project Reference Not Detected'}
              </div>
              <div className="font-mono text-[11px] text-[var(--text-secondary)] truncate">
                {projectUrl || 'No project URL specified'}
              </div>
            </div>
          </div>

          {/* Step-by-Step Restoration Directions */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[var(--accent-primary)]" />
                <h2 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)]">
                  Step-by-Step Restoration Directions
                </h2>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-600 text-white shadow-2xs">
                Takes ~1–2 Min
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Step 1 */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-2.5">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-xl bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                    1
                  </span>
                  <div className="space-y-1 text-xs sm:text-sm flex-1 min-w-0">
                    <div className="font-bold text-[var(--text-primary)]">
                      Open your Supabase Project Console
                    </div>
                    <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] leading-relaxed">
                      Tap or click the button below to open your Supabase project dashboard in a new browser tab.
                    </p>
                  </div>
                </div>

                <div className="pt-1 pl-10">
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
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-start gap-3">
                <span className="w-7 h-7 rounded-xl bg-[var(--chip-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-black flex items-center justify-center shrink-0">
                  2
                </span>
                <div className="space-y-2 text-xs sm:text-sm flex-1 min-w-0">
                  <div className="font-bold text-[var(--text-primary)]">
                    Find and click "Resume Project"
                  </div>
                  <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] leading-relaxed">
                    Look for the yellow alert banner across the top of your Supabase project dashboard:
                  </p>
                  {/* Visual simulation banner */}
                  <div className="p-3.5 rounded-xl bg-amber-500/25 dark:bg-amber-950/60 border-2 border-amber-600/50 text-xs font-mono text-[#3f1d0b] dark:text-[#fef3c7] flex items-center justify-between gap-3 overflow-x-auto shadow-2xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-600 dark:bg-amber-400 shrink-0 animate-pulse" />
                      <span className="truncate font-bold text-[#3f1d0b] dark:text-[#fef3c7]">Project is paused due to inactivity</span>
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-sans text-xs font-black shrink-0 shadow-xs">
                      Resume project
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-start gap-3">
                <span className="w-7 h-7 rounded-xl bg-[var(--chip-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-black flex items-center justify-center shrink-0">
                  3
                </span>
                <div className="space-y-1 text-xs sm:text-sm flex-1 min-w-0">
                  <div className="font-bold text-[var(--text-primary)]">
                    Wait for Cloud Re-provisioning
                  </div>
                  <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] leading-relaxed">
                    Supabase takes approximately <strong>60 to 90 seconds</strong> to boot up the PostgreSQL container.
                    The banner will show <em>"Restoring project"</em> and then disappear or turn green when ready.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-start gap-3">
                <span className="w-7 h-7 rounded-xl bg-[var(--chip-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs font-black flex items-center justify-center shrink-0">
                  4
                </span>
                <div className="space-y-1 text-xs sm:text-sm flex-1 min-w-0">
                  <div className="font-bold text-[var(--text-primary)]">
                    Switch back to EhsaanPlay
                  </div>
                  <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] leading-relaxed">
                    Return to this tab. EhsaanPlay will automatically detect when the project is active and re-establish live synchronization.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Desktop 5 cols, Tablet/Mobile 12 cols): Live Status, Auto-Detection & Tips */}
        <div className="lg:col-span-5 space-y-4">
          {/* Live Auto-Recheck Status Card */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-2xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="relative flex h-3 w-3 shrink-0">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isRestored ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-3 w-3 ${
                      isRestored ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                </span>
                <span className="font-bold text-sm sm:text-base text-[var(--text-primary)] truncate">
                  {isRestored
                    ? 'Database Restored & Online!'
                    : isChecking
                    ? 'Verifying database status...'
                    : 'Auto-detection listener active'}
                </span>
              </div>

              {checkCount > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--chip-bg)] text-[var(--text-secondary)] border border-[var(--border-subtle)] shrink-0">
                  Checks: {checkCount}
                </span>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] leading-relaxed">
              {isRestored ? (
                <div className="space-y-2">
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-2 text-xs sm:text-sm">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                    Connection successfully re-established!
                  </span>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Your Supabase database is active, verified, and synchronizing across your devices.
                  </p>
                  {onBack && (
                    <button
                      type="button"
                      onClick={onBack}
                      className="mt-2 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer text-center"
                    >
                      Return to Cloud Database & Sync
                    </button>
                  )}
                </div>
              ) : lastCheckMessage ? (
                <span>{lastCheckMessage}</span>
              ) : (
                <span>Listening for wake-up... Automatically verifying when you switch back to this tab.</span>
              )}
            </div>

            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={performCheck}
                disabled={isChecking}
                className="w-full py-2.5 rounded-2xl bg-[var(--chip-bg)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] text-xs font-bold border border-[var(--border-subtle)] transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? 'Checking Connection...' : 'Check Status Now'}</span>
              </button>
            </div>
          </div>

          {/* Device Responsive Tip Card */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-2xs space-y-2.5 text-xs text-[var(--text-secondary)]">
            <div className="font-bold text-[var(--text-primary)] flex items-center gap-2 text-xs sm:text-sm">
              <Smartphone className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
              <span>Mobile & Tablet Device Tip</span>
            </div>
            <p className="leading-relaxed text-[11px] sm:text-xs">
              On mobile browsers, tapping <strong>Open Supabase</strong> switches you to your browser's tabs.
              Once you tap <strong>Resume Project</strong> in the Supabase console, return to EhsaanPlay.
              EhsaanPlay will automatically detect your return and reconnect.
            </p>
          </div>

          {/* Authorization Notice Card */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] shadow-2xs space-y-2 text-xs text-[var(--text-secondary)]">
            <div className="font-bold text-[var(--text-primary)] flex items-center gap-2 text-xs sm:text-sm">
              <ShieldAlert className="w-4 h-4 text-sky-500 shrink-0" />
              <span>Why is manual dashboard authorization required?</span>
            </div>
            <p className="leading-relaxed text-[11px] sm:text-xs">
              EhsaanPlay stores only your client-side <strong>Publishable Key</strong>, which strictly lacks cloud infrastructure management privileges. Resuming an inactive compute server requires project-owner authorization directly in the Supabase console.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
