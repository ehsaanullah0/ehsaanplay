import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  HardDrive,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  PieChart,
} from 'lucide-react';
import {
  calculateStorageUsage,
  StorageUsageReport,
  SUPABASE_FREE_STORAGE_MB,
} from '../../services/supabase/storageUtils';

interface SupabaseStorageUsageVisualProps {
  onRefreshTrigger?: () => void;
}

export const SupabaseStorageUsageVisual: React.FC<SupabaseStorageUsageVisualProps> = ({
  onRefreshTrigger,
}) => {
  const [report, setReport] = useState<StorageUsageReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const loadUsage = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await calculateStorageUsage();
      setReport(data);
    } catch (err) {
      console.warn('Could not compute storage usage:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  if (!report) {
    return (
      <div className="p-4 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] text-xs flex items-center justify-between">
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <HardDrive className="w-4 h-4 text-[var(--accent-primary)]" />
          <span>Measuring database storage allowance...</span>
        </div>
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--text-secondary)]" />
      </div>
    );
  }

  // Determine bar fill color based on warning thresholds
  let barColor = 'bg-[var(--accent-primary)]';
  let badgeColor = 'bg-emerald-600 text-white shadow-xs';
  let badgeText = 'Normal (<80%)';

  if (report.warningLevel === 'critical') {
    barColor = 'bg-red-600';
    badgeColor = 'bg-red-600 text-white shadow-xs';
    badgeText = 'Limit Reached (100%)';
  } else if (report.warningLevel === 'danger') {
    barColor = 'bg-orange-600';
    badgeColor = 'bg-orange-600 text-white shadow-xs';
    badgeText = 'Critical (≥90%)';
  } else if (report.warningLevel === 'warning') {
    barColor = 'bg-amber-600';
    badgeColor = 'bg-amber-600 text-white shadow-xs';
    badgeText = 'Warning (≥80%)';
  }

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-[var(--bg-surface-card)] border border-[var(--border-subtle)] space-y-4 shadow-2xs text-left">
      {/* Title & Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[var(--bg-card-olive)] text-[var(--text-card-olive)] flex items-center justify-center font-black shrink-0">
            <HardDrive className="w-4.5 h-4.5 text-[var(--accent-primary)]" />
          </div>
          <div>
            <h4 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider">
              Supabase Storage Usage
            </h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Free Plan Allowance: <strong className="text-[var(--text-primary)]">{SUPABASE_FREE_STORAGE_MB} MB</strong> total capacity
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${badgeColor}`}>
            {badgeText}
          </span>
          <button
            type="button"
            onClick={() => {
              loadUsage();
              if (onRefreshTrigger) onRefreshTrigger();
            }}
            disabled={isLoading}
            title="Refresh storage metrics"
            className="p-2 rounded-xl bg-[var(--chip-bg)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[var(--text-primary)]">
            {report.usedMb} MB used
          </span>
          <span className="text-[11px] font-mono text-[var(--text-secondary)]">
            {report.percentUsed}% of 500 MB
          </span>
        </div>

        {/* Minimal Progress Bar */}
        <div className="w-full h-3 rounded-full bg-[var(--chip-bg)] border border-[var(--border-subtle)] overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full ${barColor} transition-all duration-500 ease-out`}
            style={{ width: `${Math.max(1, report.percentUsed)}%` }}
          />
        </div>
      </div>

      {/* 4-Stat Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
        <div className="p-2.5 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)]">
          <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase block">Used</span>
          <span className="text-sm font-black text-[var(--text-primary)] font-mono">{report.usedMb} MB</span>
        </div>
        <div className="p-2.5 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)]">
          <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase block">Remaining</span>
          <span className="text-sm font-black text-emerald-700 dark:text-emerald-300 font-mono">{report.remainingMb} MB</span>
        </div>
        <div className="p-2.5 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)]">
          <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase block">Total Quota</span>
          <span className="text-sm font-black text-[var(--text-primary)] font-mono">500 MB</span>
        </div>
        <div className="p-2.5 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)]">
          <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase block">Utilization</span>
          <span className="text-sm font-black text-[var(--text-primary)] font-mono">{report.percentUsed}%</span>
        </div>
      </div>

      {/* Threshold Warnings */}
      {report.warningLevel === 'critical' && (
        <div className="p-3.5 rounded-2xl bg-red-500/15 border-2 border-red-500/40 text-red-950 dark:text-red-100 text-xs flex items-start gap-2.5 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          <div className="space-y-1">
            <span className="font-bold block text-red-950 dark:text-red-100">Free Tier Storage Limit Reached (500 MB)</span>
            <p className="text-[11px] leading-relaxed text-red-900 dark:text-red-200">
              Your database has reached the 500 MB Free Plan limit. Database write requests or migrations may be restricted until unused titles are removed or your Supabase project is upgraded to the Pro Plan.
            </p>
          </div>
        </div>
      )}

      {report.warningLevel === 'danger' && (
        <div className="p-3.5 rounded-2xl bg-orange-500/15 border-2 border-orange-500/40 text-orange-950 dark:text-orange-100 text-xs flex items-start gap-2.5 font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-orange-600 dark:text-orange-400" />
          <div className="space-y-1">
            <span className="font-bold block text-orange-950 dark:text-orange-100">Critical Storage Warning (≥90% Used)</span>
            <p className="text-[11px] leading-relaxed text-orange-900 dark:text-orange-200">
              You have less than 50 MB remaining on your free allowance. Consider cleaning up old watch history or archived lists to maintain seamless sync.
            </p>
          </div>
        </div>
      )}

      {report.warningLevel === 'warning' && (
        <div className="p-3.5 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 text-amber-950 dark:text-amber-100 text-xs flex items-start gap-2.5 font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <span className="font-bold block text-amber-950 dark:text-amber-100">Storage Notice (≥80% Used)</span>
            <p className="text-[11px] leading-relaxed text-amber-900 dark:text-amber-200">
              Your database is approaching the 500 MB free plan limit. {report.remainingMb} MB remaining.
            </p>
          </div>
        </div>
      )}

      {/* Explanatory Technical Notice & Limitations Disclosure */}
      <div className="pt-2 border-t border-[var(--border-subtle)] text-[11px] space-y-2 text-[var(--text-secondary)]">
        <div className="flex items-start gap-2 leading-relaxed">
          <Info className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
          <div>
            <span>
              {report.isDirectServerMetric
                ? 'Measured directly from database server RPC.'
                : `Calculated from your synchronized library payload and active records (${report.itemCounts.mediaItems} titles, ${report.itemCounts.personalStates} states, ${report.itemCounts.customLists} shelves).`}
            </span>{' '}
            <span>
              Client publishable keys do not have privileges to execute PostgreSQL administrative disk queries (<code className="font-mono text-[10px] bg-[var(--chip-bg)] px-1 py-0.5 rounded">pg_database_size</code>).
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <a
            href={report.dashboardUsageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--accent-primary)] hover:underline"
          >
            <span>View Exact Physical Disk Usage in Supabase Dashboard</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            type="button"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="text-[10px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            {showTechnicalDetails ? 'Hide Details' : 'What counts as storage?'}
          </button>
        </div>

        {showTechnicalDetails && (
          <div className="p-3 rounded-2xl bg-[var(--chip-bg)] border border-[var(--border-subtle)] space-y-1.5 text-[10px] text-[var(--text-secondary)] animate-fade-in">
            <div className="font-bold text-[var(--text-primary)]">What is included in the 500 MB quota?</div>
            <p className="leading-relaxed">
              Supabase Free Plan includes 500 MB of total PostgreSQL disk space across all tables, B-tree indexes, and Write-Ahead Logs (WAL).
              EhsaanPlay minimizes footprint by indexing only necessary foreign keys and storing normalized timestamps and integer durations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
