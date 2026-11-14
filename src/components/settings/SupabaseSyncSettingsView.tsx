import React, { useState, useEffect, useCallback } from 'react';
import {
  Cloud,
  Database,
  Key,
  Check,
  Copy,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Lock,
  User as UserIcon,
  Mail,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  X,
  Eye,
  EyeOff,
  Radio,
  DownloadCloud,
  UploadCloud,
  Laptop,
  Smartphone,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  FileCode,
  Sparkles,
  PlayCircle,
  HardDrive,
} from 'lucide-react';
import { User } from '@supabase/supabase-js';
import {
  loadSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  isValidSupabaseUrl,
  isValidPublishableKey,
  SupabaseVerificationStatus,
  SyncState,
  getSupabaseDashboardUrl,
} from '../../services/supabase/config';
import {
  verifySupabaseDatabase,
  testSupabaseConnection,
} from '../../services/supabase/verification';
import { ResumeDatabaseView } from './ResumeDatabaseView';
import { SupabaseStorageUsageVisual } from './SupabaseStorageUsageVisual';
import {
  EHSAAN_PLAY_SUPABASE_SQL_MIGRATION,
  EXPECTED_SCHEMA_VERSION,
} from '../../services/supabase/schemaMigration';
import {
  getCloudUser,
  signUpWithEmail,
  signInWithEmail,
  signOutCloudUser,
  sendPasswordResetEmail,
  subscribeToAuthChanges,
} from '../../services/supabase/auth';
import {
  getSyncStatus,
  subscribeToSyncStatus,
  executeFullSync,
  initializeRealtimeSubscription,
  SyncStatusInfo,
} from '../../services/supabase/syncService';
import {
  inspectMigrationCounts,
  executeSafeLocalToCloudMigration,
  MigrationSummary,
  MigrationProgress,
  MigrationExecutionResult,
} from '../../services/supabase/migrationHelper';

interface SupabaseSyncSettingsViewProps {
  onRefreshData?: () => void;
  onOpenResumePage?: () => void;
}

export const SupabaseSyncSettingsView: React.FC<SupabaseSyncSettingsViewProps> = ({
  onRefreshData,
  onOpenResumePage,
}) => {
  // Config form states
  const [projectUrl, setProjectUrl] = useState('');
  const [publishableKey, setPublishableKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Verification & test states
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<SupabaseVerificationStatus | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Auth states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Sync states
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>(getSyncStatus());
  const [isSyncRunning, setIsSyncRunning] = useState(false);

  // Migration states
  const [migrationSummary, setMigrationSummary] = useState<MigrationSummary | null>(null);
  const [migrationProgress, setMigrationProgress] = useState<MigrationProgress | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationExecutionResult | null>(null);

  // Setup guide expand/collapse state & active tab
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [activeGuideStep, setActiveGuideStep] = useState<number>(1);
  const [isSqlCopied, setIsSqlCopied] = useState(false);

  // Resume paused database full settings page state
  const [isResumeViewActive, setIsResumeViewActive] = useState(false);
  const [storageRefreshKey, setStorageRefreshKey] = useState(0);

  const handleOpenResume = () => {
    if (onOpenResumePage) {
      onOpenResumePage();
    } else {
      setIsResumeViewActive(true);
    }
  };

  // Load existing config on mount
  useEffect(() => {
    const existing = loadSupabaseConfig();
    if (existing) {
      setProjectUrl(existing.url);
      setPublishableKey(existing.publishableKey);
      setIsSaved(true);
      // Run verification in background
      verifySupabaseDatabase().then(status => {
        setVerificationResult(status);
      });
    }

    // Check user session
    getCloudUser().then(user => {
      setCurrentUser(user);
    });

    // Subscribe to auth changes
    const unsubAuth = subscribeToAuthChanges(user => {
      setCurrentUser(user);
      if (user) {
        initializeRealtimeSubscription();
        executeFullSync();
        inspectMigrationCounts().then(setMigrationSummary);
      }
    });

    // Subscribe to sync status changes
    const unsubSync = subscribeToSyncStatus(status => {
      setSyncStatus(status);
    });

    return () => {
      unsubAuth();
      unsubSync();
    };
  }, []);

  // Show transient toast helper
  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // 1. Handle Connect & Save
  const handleConnect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError(null);
    setVerificationResult(null);

    if (!isValidSupabaseUrl(projectUrl)) {
      setFormError('Please enter a valid Supabase Project URL (e.g. https://xyzcompany.supabase.co).');
      return;
    }

    const keyValidation = isValidPublishableKey(publishableKey);
    if (!keyValidation.valid) {
      setFormError(keyValidation.message || 'Invalid publishable key.');
      return;
    }

    setIsVerifying(true);
    try {
      const result = await testSupabaseConnection(projectUrl, publishableKey);
      setVerificationResult(result);

      if (result.reachable) {
        saveSupabaseConfig({
          url: projectUrl.trim(),
          publishableKey: publishableKey.trim(),
          configuredAt: new Date().toISOString(),
          verifiedAt: result.schemaInstalled ? new Date().toISOString() : undefined,
        });
        setIsSaved(true);
        triggerToast('Supabase credentials verified & saved!');

        // Check if user is already logged in
        const user = await getCloudUser();
        setCurrentUser(user);
        if (user) {
          initializeRealtimeSubscription();
          executeFullSync();
          inspectMigrationCounts().then(setMigrationSummary);
        }
      } else {
        setFormError(result.errorMessage || 'Failed to connect to Supabase project.');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Connection test failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  // 2. Handle Test Connection without altering credentials
  const handleTestConnection = async () => {
    setFormError(null);
    setIsVerifying(true);
    try {
      const result = await testSupabaseConnection(projectUrl, publishableKey);
      setVerificationResult(result);
      if (result.reachable && result.schemaInstalled) {
        triggerToast('✓ Connection & database schema verified successfully!');
      } else if (result.reachable) {
        setFormError('Database is reachable, but the EhsaanPlay schema is not installed. See Step 4 in the guide.');
      } else {
        setFormError(result.errorMessage || 'Database unreachable.');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Test failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  // 3. Handle Disconnect
  const handleDisconnect = async () => {
    if (window.confirm('Disconnect your personal Supabase project? Local data will remain intact, but cloud synchronization will be disabled.')) {
      await signOutCloudUser();
      clearSupabaseConfig();
      setProjectUrl('');
      setPublishableKey('');
      setIsSaved(false);
      setCurrentUser(null);
      setVerificationResult(null);
      setMigrationSummary(null);
      triggerToast('Supabase database disconnected.');
    }
  };

  // 4. Handle Copy SQL Script
  const handleCopySql = () => {
    navigator.clipboard.writeText(EHSAAN_PLAY_SUPABASE_SQL_MIGRATION).then(() => {
      setIsSqlCopied(true);
      triggerToast('SQL migration script copied to clipboard!');
      setTimeout(() => setIsSqlCopied(false), 2500);
    });
  };

  // 5. Handle Authentication (Sign In / Sign Up / Reset)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFeedback(null);
    setIsAuthSubmitting(true);

    try {
      if (authMode === 'signup') {
        const res = await signUpWithEmail(authEmail, authPassword);
        setAuthFeedback({ success: res.success, message: res.message || '' });
        if (res.success && res.user && !res.requiresEmailConfirmation) {
          setCurrentUser(res.user);
          triggerToast('Account created & signed in!');
          initializeRealtimeSubscription();
          executeFullSync();
        }
      } else if (authMode === 'signin') {
        const res = await signInWithEmail(authEmail, authPassword);
        setAuthFeedback({ success: res.success, message: res.message || '' });
        if (res.success && res.user) {
          setCurrentUser(res.user);
          triggerToast('Signed in successfully!');
          initializeRealtimeSubscription();
          executeFullSync();
          inspectMigrationCounts().then(setMigrationSummary);
        }
      } else if (authMode === 'reset') {
        const res = await sendPasswordResetEmail(authEmail);
        setAuthFeedback({ success: res.success, message: res.message || '' });
      }
    } catch (err) {
      setAuthFeedback({
        success: false,
        message: err instanceof Error ? err.message : 'Authentication action failed.',
      });
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  // 6. Handle Sign Out
  const handleSignOut = async () => {
    const res = await signOutCloudUser();
    if (res.success) {
      setCurrentUser(null);
      setMigrationSummary(null);
      triggerToast('Signed out of Supabase cloud account.');
    }
  };

  // 7. Handle Manual Sync Now
  const handleSyncNow = async () => {
    setIsSyncRunning(true);
    try {
      const res = await executeFullSync();
      if (res.success) {
        triggerToast('✓ Library synchronized with Supabase!');
        if (onRefreshData) onRefreshData();
      } else {
        setFormError(res.message);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Sync failed.');
    } finally {
      setIsSyncRunning(false);
    }
  };

  // 8. Handle Safe Local to Cloud Migration
  const handleStartMigration = async () => {
    if (
      !window.confirm(
        'Upload your existing local library (titles, watch progress, ratings, shelves) to your connected Supabase database? Local data will be preserved.'
      )
    ) {
      return;
    }

    setIsMigrating(true);
    setMigrationResult(null);

    const res = await executeSafeLocalToCloudMigration(progress => {
      setMigrationProgress(progress);
    });

    setMigrationResult(res);
    setIsMigrating(false);

    if (res.success) {
      triggerToast('✓ Local library safely uploaded to your Supabase project!');
      inspectMigrationCounts().then(setMigrationSummary);
      if (onRefreshData) onRefreshData();
    }
  };

  if (isResumeViewActive) {
    return (
      <ResumeDatabaseView
        projectUrl={projectUrl}
        publishableKey={publishableKey}
        onBack={() => setIsResumeViewActive(false)}
        onConnectionRestored={status => {
          setVerificationResult(status);
          setStorageRefreshKey(k => k + 1);
          triggerToast('✓ Supabase connection restored & active!');
          if (onRefreshData) onRefreshData();
        }}
        onRefreshData={onRefreshData}
        isSubpage={true}
      />
    );
  }

  // Compute status badge
  const renderStatusBadge = () => {
    if (!isSaved) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[var(--chip-bg)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
          <Database className="w-3.5 h-3.5" />
          <span>Not Connected</span>
        </span>
      );
    }

    if (verificationResult && (!verificationResult.reachable || verificationResult.isPaused)) {
      return (
        <button
          type="button"
          onClick={handleOpenResume}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-xs cursor-pointer transition active:scale-95"
          title="Click to view Resume Database instructions"
        >
          <PlayCircle className="w-3.5 h-3.5 text-white" />
          <span>{verificationResult.isPaused ? 'Database Paused · Resume' : 'Database Offline · Resume'}</span>
        </button>
      );
    }

    if (verificationResult && !verificationResult.schemaInstalled) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-600 text-white shadow-xs">
          <AlertCircle className="w-3.5 h-3.5 text-white" />
          <span>Schema Setup Required</span>
        </span>
      );
    }

    if (!currentUser) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-600 text-white shadow-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-white" />
          <span>Database Ready · Sign In Required</span>
        </span>
      );
    }

    if (syncStatus.state === 'syncing' || isSyncRunning) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Syncing Changes...</span>
        </span>
      );
    }

    if (syncStatus.pendingQueueCount > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-600 text-white shadow-xs">
          <Radio className="w-3.5 h-3.5 text-white" />
          <span>Offline · {syncStatus.pendingQueueCount} Pending</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
        <span>Live Sync Active</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-black shadow-xl animate-scale-up flex items-center gap-2 border border-white/20">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Main Header Card */}
      <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center shrink-0">
              <Cloud className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight">
                  Cloud Database & Sync
                </h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Bring Your Own Database (BYOD) · Private user-owned Supabase storage & live cross-device sync.
              </p>
            </div>
          </div>
          <div>{renderStatusBadge()}</div>
        </div>

        {/* Informational Callout */}
        <div className="bg-[var(--chip-bg)] rounded-2xl p-4 text-xs text-[var(--text-secondary)] leading-relaxed border border-[var(--border-subtle)] flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[var(--accent-primary)] shrink-0 mt-0.5" />
          <div>
            <strong className="text-[var(--text-primary)] font-bold">Zero Shared Database Architecture:</strong> Connect your personal, free Supabase project to securely synchronize your watchlist, ratings, custom shelves, and watch progress between desktop and mobile browsers. All records are protected at the database level by Supabase Row Level Security (RLS).
          </div>
        </div>
      </div>

      {/* Database Credentials Form */}
      <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[var(--accent-primary)]" />
            <h4 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider">
              1. Project Credentials
            </h4>
          </div>
          <button
            type="button"
            onClick={() => setIsGuideOpen(!isGuideOpen)}
            className="text-xs font-bold text-[var(--accent-primary)] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{isGuideOpen ? 'Hide Setup Guide' : 'Open Setup Guide'}</span>
          </button>
        </div>

        <form onSubmit={handleConnect} className="space-y-4">
          {/* Project URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
              <span>Supabase Project URL</span>
              <a
                href="https://supabase.com/dashboard/project/_/settings/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-[var(--accent-primary)] hover:underline flex items-center gap-1"
              >
                Find in Dashboard <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <input
              type="url"
              value={projectUrl}
              onChange={e => setProjectUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full px-4 py-2.5 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
            />
            <p className="text-[11px] text-[var(--text-secondary)]">
              Your unique Supabase API base endpoint from Settings → API.
            </p>
          </div>

          {/* Publishable Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
              <span>Supabase Publishable Key</span>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                Public client key only
              </span>
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={publishableKey}
                onChange={e => setPublishableKey(e.target.value)}
                placeholder="sb_publishable_... or anon JWT (eyJ...)"
                className="w-full px-4 py-2.5 pr-10 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Typically begins with <code className="font-mono font-bold">sb_publishable_</code> or <code className="font-mono font-bold">eyJ</code> (anon key). Never enter a secret or service_role key.
            </p>
          </div>

          {/* Form Error Alert */}
          {formError && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{formError}</div>
            </div>
          )}

          {/* Verification Diagnostics Box */}
          {verificationResult && (
            <div className="p-4 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] space-y-2 text-xs">
              <div className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Diagnostics & Status</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${verificationResult.reachable ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span>Project Endpoint: {verificationResult.reachable ? 'Reachable' : 'Unreachable'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${verificationResult.schemaInstalled ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span>EhsaanPlay Schema: {verificationResult.schemaInstalled ? `v${verificationResult.schemaVersion}` : 'Not Installed'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${verificationResult.tablesVerified ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span>Tables (States/Lists/Media/Settings): {verificationResult.tablesVerified ? 'Verified' : 'Check Step 4'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${currentUser ? 'bg-emerald-500' : 'bg-sky-500'}`} />
                  <span>User Account: {currentUser ? currentUser.email : 'Sign in below'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Paused Database Detection Banner */}
          {verificationResult && (!verificationResult.reachable || verificationResult.isPaused) && (
            <div className="p-4 rounded-2xl bg-amber-500/15 dark:bg-amber-950/40 border-2 border-amber-600/50 space-y-2 text-xs shadow-2xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4.5 h-4.5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-black text-sm text-[#3f1d0b] dark:text-[#fef3c7]">
                    {verificationResult.isPaused ? 'Database Project Paused (Inactivity)' : 'Database Project Unavailable / Paused'}
                  </div>
                  <p className="text-xs text-[#451a03] dark:text-[#fde68a] leading-relaxed font-medium">
                    Free-tier Supabase projects automatically pause after 7 days of inactivity. If your project is paused, click <strong className="text-[#290e03] dark:text-white font-extrabold underline decoration-amber-500/50">Resume Database</strong> to wake it up in your Supabase dashboard.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 pl-7">
                <button
                  type="button"
                  onClick={handleOpenResume}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <PlayCircle className="w-3.5 h-3.5 text-white" />
                  <span>Resume Database Guide</span>
                </button>
                <a
                  href={getSupabaseDashboardUrl(projectUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs"
                >
                  <span>Open Supabase</span>
                  <ExternalLink className="w-3 h-3 text-white" />
                </a>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              type="submit"
              disabled={isVerifying || !projectUrl.trim() || !publishableKey.trim()}
              className="px-5 py-2.5 rounded-2xl bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-black hover:opacity-90 active:scale-95 transition disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-xs"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{isSaved ? 'Update Credentials' : 'Connect Database'}</span>
                </>
              )}
            </button>

            {isSaved && (
              <>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isVerifying}
                  className="px-4 py-2.5 rounded-2xl bg-[var(--chip-bg)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] text-xs font-bold border border-[var(--border-subtle)] transition active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                  <span>Test Connection</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenResume}
                  className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-2 shadow-xs"
                  title="Step-by-step instructions to resume an inactive Supabase database"
                >
                  <PlayCircle className="w-3.5 h-3.5 text-white" />
                  <span>Resume Database</span>
                </button>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-2 ml-auto shadow-xs"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                  <span>Disconnect</span>
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      {/* Supabase Storage Usage Visual (Free Plan 500 MB Allowance) */}
      {isSaved && (
        <SupabaseStorageUsageVisual
          key={storageRefreshKey}
          onRefreshTrigger={() => {
            setStorageRefreshKey(k => k + 1);
            if (onRefreshData) onRefreshData();
          }}
        />
      )}

      {/* Complete Step-by-Step Setup Guide Accordion */}
      <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => setIsGuideOpen(!isGuideOpen)}
          className="w-full p-5 sm:p-6 text-left flex items-center justify-between hover:bg-[var(--chip-bg)]/50 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center shrink-0">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-[var(--text-primary)]">
                Supabase Setup Guide & SQL Migration
              </h4>
              <p className="text-xs text-[var(--text-secondary)]">
                Step-by-step instructions: create project, copy schema SQL, and link devices.
              </p>
            </div>
          </div>
          <div className="p-1 rounded-full bg-[var(--chip-bg)] text-[var(--text-secondary)]">
            {isGuideOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {isGuideOpen && (
          <div className="p-5 sm:p-6 pt-0 border-t border-[var(--border-subtle)] space-y-6 animate-fade-in text-xs leading-relaxed">
            {/* Step Selector Tabs */}
            <div className="flex overflow-x-auto no-scrollbar gap-1.5 pb-2 pt-4 border-b border-[var(--border-subtle)]">
              {[
                { step: 1, title: '1. Account' },
                { step: 2, title: '2. Project' },
                { step: 3, title: '3. API Keys' },
                { step: 4, title: '4. SQL Schema' },
                { step: 5, title: '5. Verify' },
                { step: 6, title: '6. User Account' },
                { step: 7, title: '7. Multi-Device' },
              ].map(s => (
                <button
                  key={s.step}
                  onClick={() => setActiveGuideStep(s.step)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    activeGuideStep === s.step
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                      : 'bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {s.title}
                </button>
              ))}
            </div>

            {/* Step 1: Create Supabase Account */}
            {activeGuideStep === 1 && (
              <div className="space-y-3">
                <h5 className="text-sm font-black text-[var(--text-primary)]">Step 1 — Create a Supabase Account</h5>
                <p className="text-[var(--text-secondary)]">
                  Supabase provides an open-source, user-owned Postgres database with generous free tiers. You need your own free Supabase account:
                </p>
                <div className="flex items-center gap-3">
                  <a
                    href="https://supabase.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold text-xs hover:opacity-90 transition shadow-xs"
                  >
                    <span>Open Supabase.com</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <span className="text-[11px] text-[var(--text-secondary)]">Sign up or sign into your existing account.</span>
                </div>
              </div>
            )}

            {/* Step 2: Create a Project */}
            {activeGuideStep === 2 && (
              <div className="space-y-3">
                <h5 className="text-sm font-black text-[var(--text-primary)]">Step 2 — Create a Supabase Project</h5>
                <ol className="list-decimal pl-5 space-y-1.5 text-[var(--text-secondary)]">
                  <li>Open the Supabase Dashboard and click <strong>New Project</strong>.</li>
                  <li>Choose your preferred organization.</li>
                  <li>Enter a Project Name (e.g. <code className="font-mono font-bold">EhsaanPlay-Database</code>).</li>
                  <li>Enter a strong <strong>Database Password</strong> (store it securely in your password manager). Note: This password is for Supabase administrative access only and is <em>never</em> entered into EhsaanPlay.</li>
                  <li>Select the closest cloud region to you.</li>
                  <li>Click <strong>Create New Project</strong> and wait ~1-2 minutes for provisioning to finish.</li>
                </ol>
              </div>
            )}

            {/* Step 3: Find Project URL and Key */}
            {activeGuideStep === 3 && (
              <div className="space-y-3">
                <h5 className="text-sm font-black text-[var(--text-primary)]">Step 3 — Find Project URL & Publishable Key</h5>
                <p className="text-[var(--text-secondary)]">
                  In your Supabase project dashboard, navigate to <strong>Project Settings → API</strong> (or click below):
                </p>
                <a
                  href="https://supabase.com/dashboard/project/_/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--accent-primary)] hover:underline"
                >
                  <span>Open API Settings in Dashboard</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  <div className="p-3.5 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)]">
                    <strong className="block text-[var(--text-primary)] mb-1">Project URL</strong>
                    <span className="text-[11px] text-[var(--text-secondary)]">Begins with <code className="font-mono font-bold">https://&lt;id&gt;.supabase.co</code>. Paste into the Project URL field above.</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)]">
                    <strong className="block text-[var(--text-primary)] mb-1">Publishable / Anon Key</strong>
                    <span className="text-[11px] text-[var(--text-secondary)]">Begins with <code className="font-mono font-bold">sb_publishable_</code> or <code className="font-mono font-bold">eyJ</code>. Paste into Publishable Key field. Never use secret/service_role keys.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Install SQL Schema */}
            {activeGuideStep === 4 && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h5 className="text-sm font-black text-[var(--text-primary)]">
                    Step 4 — Install the EhsaanPlay Database Schema
                  </h5>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold text-xs hover:opacity-90 active:scale-95 transition cursor-pointer self-start sm:self-auto shadow-xs"
                  >
                    {isSqlCopied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isSqlCopied ? 'Copied to Clipboard!' : 'Copy SQL Script'}</span>
                  </button>
                </div>
                <p className="text-[var(--text-secondary)]">
                  Supabase requires database tables and Row Level Security (RLS) policies for user data protection.
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-[var(--text-secondary)]">
                  <li>In your Supabase project, click on <strong>SQL Editor</strong> in the left sidebar.</li>
                  <li>Click <strong>+ New Query</strong>.</li>
                  <li>Click the <strong>Copy SQL Script</strong> button above and paste into the editor.</li>
                  <li>Click <strong>Run</strong> (or press Ctrl/Cmd + Enter) to execute.</li>
                  <li>Return here and click <strong>Test Connection</strong> above to verify installation!</li>
                </ol>

                {/* Code Block Preview */}
                <div className="relative mt-2">
                  <pre className="p-4 rounded-2xl bg-black/90 text-emerald-400 font-mono text-[11px] max-h-48 overflow-y-auto no-scrollbar border border-white/10 leading-relaxed">
                    {EHSAAN_PLAY_SUPABASE_SQL_MIGRATION}
                  </pre>
                </div>
              </div>
            )}

            {/* Step 5: Connect and Verify */}
            {activeGuideStep === 5 && (
              <div className="space-y-3">
                <h5 className="text-sm font-black text-[var(--text-primary)]">Step 5 — Connect and Verify</h5>
                <p className="text-[var(--text-secondary)]">
                  After running the SQL script in Step 4, enter your Project URL and Publishable Key in the form above and click <strong>Connect Database</strong>. EhsaanPlay will automatically test reachability, verify the schema version, and confirm that Row Level Security is active.
                </p>
              </div>
            )}

            {/* Step 6: Create Account */}
            {activeGuideStep === 6 && (
              <div className="space-y-3">
                <h5 className="text-sm font-black text-[var(--text-primary)]">Step 6 — Create Your Cloud User Account</h5>
                <p className="text-[var(--text-secondary)]">
                  Each user in your database has an isolated account authenticated via Supabase Auth (Email & Password). Use the account panel below to create your account.
                </p>
              </div>
            )}

            {/* Step 7: Multi-Device Sync */}
            {activeGuideStep === 7 && (
              <div className="space-y-3">
                <h5 className="text-sm font-black text-[var(--text-primary)]">Step 7 — Connect Another Device (Desktop & Mobile)</h5>
                <div className="p-4 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] space-y-3">
                  <div className="flex items-center gap-3">
                    <Laptop className="w-5 h-5 text-[var(--accent-primary)]" />
                    <ArrowRight className="w-4 h-4 text-[var(--text-secondary)]" />
                    <Smartphone className="w-5 h-5 text-[var(--accent-primary)]" />
                    <span className="font-bold text-[var(--text-primary)]">Cross-Device Synchronization</span>
                  </div>
                  <ol className="list-decimal pl-5 space-y-1.5 text-[var(--text-secondary)]">
                    <li>Open EhsaanPlay on your second device (e.g. mobile browser).</li>
                    <li>Go to <strong>Settings → Cloud Database & Sync</strong>.</li>
                    <li>Enter the <strong>same Supabase Project URL</strong> and <strong>same Publishable Key</strong>.</li>
                    <li>Sign in using the <strong>same email and password</strong>.</li>
                    <li>Wait a few moments for initial sync to download your library, custom shelves, and watch history!</li>
                  </ol>
                  <p className="text-[11px] text-[var(--text-secondary)] italic">
                    Note: Both devices must connect to the same Supabase project and sign into the same user account to synchronize data.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cloud Account Panel (Supabase Auth) */}
      {isSaved && (
        <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] p-5 sm:p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-[var(--accent-primary)]" />
              <h4 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider">
                2. Cloud Account & Identity
              </h4>
            </div>
            {currentUser && (
              <span className="text-[11px] font-black text-white bg-emerald-600 px-2.5 py-1 rounded-full shadow-xs">
                Active Session
              </span>
            )}
          </div>

          {currentUser ? (
            /* Signed In View */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--accent-primary)] text-[var(--bg-primary)] flex items-center justify-center font-black text-sm">
                    {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-[var(--text-primary)]">{currentUser.email}</div>
                    <div className="text-[10px] text-[var(--text-secondary)] font-mono">User ID: {currentUser.id}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold transition active:scale-95 cursor-pointer self-start sm:self-auto shadow-xs"
                >
                  Sign Out
                </button>
              </div>

              {/* Sync Controls & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                    Last Cloud Sync
                  </span>
                  <div className="text-sm font-black text-[var(--text-primary)]">
                    {syncStatus.lastSyncAt
                      ? new Date(syncStatus.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                      : 'Never'}
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    {syncStatus.isRealtimeConnected ? '✓ Supabase Realtime connected' : 'Connecting Realtime...'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                      Offline Queue
                    </span>
                    <div className="text-sm font-black text-[var(--text-primary)]">
                      {syncStatus.pendingQueueCount === 0
                        ? '0 pending changes'
                        : `${syncStatus.pendingQueueCount} queued for upload`}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncNow}
                    disabled={isSyncRunning}
                    className="px-3.5 py-2 rounded-xl bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-90 active:scale-95 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncRunning ? 'animate-spin' : ''}`} />
                    <span>Sync Now</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Sign In / Sign Up Form */
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <button
                  type="button"
                  onClick={() => { setAuthMode('signin'); setAuthFeedback(null); }}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                    authMode === 'signin'
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                      : 'bg-[var(--chip-bg)] text-[var(--text-secondary)]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('signup'); setAuthFeedback(null); }}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                    authMode === 'signup'
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                      : 'bg-[var(--chip-bg)] text-[var(--text-secondary)]'
                  }`}
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('reset'); setAuthFeedback(null); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ml-auto ${
                    authMode === 'reset'
                      ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Forgot Password?
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-primary)]">Email Address</label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-4 py-2.5 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                  />
                </div>

                {authMode !== 'reset' && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[var(--text-primary)]">Password</label>
                    <div className="relative">
                      <input
                        type={showAuthPassword ? 'text' : 'password'}
                        required
                        value={authPassword}
                        onChange={e => setAuthPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 pr-10 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAuthPassword(!showAuthPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        {showAuthPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {authFeedback && (
                  <div
                    className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 ${
                      authFeedback.success
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400'
                    }`}
                  >
                    {authFeedback.success ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                    <div>{authFeedback.message}</div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isAuthSubmitting}
                  className="w-full py-2.5 rounded-2xl bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-black hover:opacity-90 active:scale-95 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  {isAuthSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : authMode === 'signup' ? (
                    'Create Supabase Account'
                  ) : authMode === 'signin' ? (
                    'Sign In to Supabase'
                  ) : (
                    'Send Password Reset Link'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Safe Local-to-Cloud Migration Card (Available when connected & signed in) */}
      {isSaved && currentUser && (
        <div className="bg-[var(--bg-surface-card)] rounded-3xl border border-[var(--border-subtle)] p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-[var(--accent-primary)]" />
              <h4 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider">
                3. Local-to-Cloud Migration
              </h4>
            </div>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Existing movies, watch states, ratings, and custom shelves stored locally can be safely uploaded to your connected Supabase database so all your devices stay in sync. Local storage is always preserved.
          </p>

          {/* Migration Summary Counts */}
          {migrationSummary && (
            <div className="grid grid-cols-3 gap-2 py-2">
              <div className="p-3 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] text-center">
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase block">Titles</span>
                <span className="text-base font-black text-[var(--text-primary)]">{migrationSummary.localMediaCount}</span>
                <span className="text-[9px] text-[var(--text-secondary)] block">({migrationSummary.cloudMediaCount} in cloud)</span>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] text-center">
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase block">States</span>
                <span className="text-base font-black text-[var(--text-primary)]">{migrationSummary.localStatesCount}</span>
                <span className="text-[9px] text-[var(--text-secondary)] block">({migrationSummary.cloudStatesCount} in cloud)</span>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] text-center">
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase block">Shelves</span>
                <span className="text-base font-black text-[var(--text-primary)]">{migrationSummary.localListsCount}</span>
                <span className="text-[9px] text-[var(--text-secondary)] block">({migrationSummary.cloudListsCount} in cloud)</span>
              </div>
            </div>
          )}

          {/* Progress Bar when migrating */}
          {isMigrating && migrationProgress && (
            <div className="space-y-2 p-3.5 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)]">
              <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
                <span>{migrationProgress.message}</span>
                <span>{migrationProgress.percent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--border-subtle)] overflow-hidden">
                <div
                  className="h-full bg-[var(--accent-primary)] transition-all duration-300"
                  style={{ width: `${migrationProgress.percent}%` }}
                />
              </div>
            </div>
          )}

          {migrationResult && (
            <div
              className={`p-3.5 rounded-2xl text-xs flex flex-col gap-2 ${
                migrationResult.success
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400'
              }`}
            >
              <div className="flex items-start gap-2">
                {migrationResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <div className="font-medium leading-relaxed">{migrationResult.message}</div>
              </div>

              {migrationResult.migratedCounts && (
                <div className="pt-2 border-t border-current/10 space-y-2 text-[11px]">
                  <div className="grid grid-cols-3 gap-1.5 opacity-90 font-semibold text-center">
                    <span className="p-1.5 rounded-lg bg-[var(--chip-bg)]">Titles: {migrationResult.migratedCounts.media}</span>
                    <span className="p-1.5 rounded-lg bg-[var(--chip-bg)]">States: {migrationResult.migratedCounts.states}</span>
                    <span className="p-1.5 rounded-lg bg-[var(--chip-bg)]">Shelves: {migrationResult.migratedCounts.lists}</span>
                  </div>

                  {migrationResult.failedDetails && migrationResult.failedDetails.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-300">
                      <div className="font-bold mb-1 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Skipped items ({migrationResult.failedDetails.length}):</span>
                      </div>
                      <div className="max-h-24 overflow-y-auto space-y-1 text-[10px] font-mono">
                        {migrationResult.failedDetails.map((f, i) => (
                          <div key={i} className="truncate">
                            • <span className="font-bold">{f.title || f.id}</span>: {f.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="pt-1">
            <button
              type="button"
              onClick={handleStartMigration}
              disabled={isMigrating}
              className="px-5 py-2.5 rounded-2xl bg-[var(--accent-primary)] text-[var(--bg-primary)] text-xs font-black hover:opacity-90 active:scale-95 transition disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-xs"
            >
              {isMigrating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Migrating Data...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Local Data to Supabase</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
