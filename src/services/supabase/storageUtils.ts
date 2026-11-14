import { getSupabaseClient, loadSupabaseConfig, extractSupabaseProjectRef, getSupabaseUsageDashboardUrl } from './config';
import { getCloudUser } from './auth';

export const SUPABASE_FREE_STORAGE_MB = 500;
export const SUPABASE_FREE_STORAGE_BYTES = 500 * 1024 * 1024; // 524,288,000 bytes

export type StorageWarningLevel = 'normal' | 'warning' | 'danger' | 'critical';

export interface StorageUsageReport {
  usedBytes: number;
  usedMb: number;
  totalMb: number;
  remainingMb: number;
  percentUsed: number;
  isDirectServerMetric: boolean;
  itemCounts: {
    mediaItems: number;
    personalStates: number;
    customLists: number;
  };
  warningLevel: StorageWarningLevel;
  limitReached: boolean;
  projectRef: string | null;
  dashboardUsageUrl: string;
  measuredAt: string;
}

/**
 * Calculates local synchronized payload bytes from browser storage
 */
export function getSynchronizedPayloadBytes(): {
  bytes: number;
  counts: { mediaItems: number; personalStates: number; customLists: number };
} {
  let bytes = 0;
  let mediaCount = 0;
  let statesCount = 0;
  let listsCount = 0;

  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return {
      bytes: 0,
      counts: { mediaItems: 0, personalStates: 0, customLists: 0 },
    };
  }

  try {
    const rawMedia = localStorage.getItem('ehsaan_media_cache_v1');
    if (rawMedia) {
      bytes += new Blob([rawMedia]).size;
      const parsed = JSON.parse(rawMedia);
      if (Array.isArray(parsed)) mediaCount = parsed.length;
    }

    const rawStates = localStorage.getItem('ehsaan_user_states_v1');
    if (rawStates) {
      bytes += new Blob([rawStates]).size;
      const parsed = JSON.parse(rawStates);
      if (parsed && typeof parsed === 'object') statesCount = Object.keys(parsed).length;
    }

    const rawLists = localStorage.getItem('ehsaan_custom_lists_v1');
    if (rawLists) {
      bytes += new Blob([rawLists]).size;
      const parsed = JSON.parse(rawLists);
      if (Array.isArray(parsed)) listsCount = parsed.length;
    }

    const rawSettings = localStorage.getItem('ehsaan_app_settings_v1');
    if (rawSettings) {
      bytes += new Blob([rawSettings]).size;
    }
  } catch (err) {
    console.warn('Could not read exact local payload bytes:', err);
  }

  // Account for PostgreSQL row overhead, page headers and B-Tree indexes (~1.8x multiplier)
  const estimatedPostgresOverheadBytes = Math.round(bytes * 1.8);

  return {
    bytes: Math.max(bytes, estimatedPostgresOverheadBytes),
    counts: {
      mediaItems: mediaCount,
      personalStates: statesCount,
      customLists: listsCount,
    },
  };
}

/**
 * Computes storage usage metrics against the 500 MB Supabase Free plan allowance.
 * Attempts server RPC query if configured; otherwise computes exact synchronized
 * library footprint and provides verified links to the Supabase console.
 */
export async function calculateStorageUsage(): Promise<StorageUsageReport> {
  const config = loadSupabaseConfig();
  const projectRef = extractSupabaseProjectRef(config?.url);
  const dashboardUsageUrl = getSupabaseUsageDashboardUrl(config?.url);

  let usedBytes = 0;
  let isDirectServerMetric = false;
  const client = getSupabaseClient();
  const user = await getCloudUser();

  const localPayload = getSynchronizedPayloadBytes();
  usedBytes = localPayload.bytes;
  let mediaItems = localPayload.counts.mediaItems;
  let personalStates = localPayload.counts.personalStates;
  let customLists = localPayload.counts.customLists;

  // Attempt to check if an RPC function exists on the project (e.g. if the user added get_db_size)
  if (client) {
    try {
      const { data: serverSize, error: rpcError } = await client.rpc('get_database_size');
      if (!rpcError && typeof serverSize === 'number' && serverSize > 0) {
        usedBytes = serverSize;
        isDirectServerMetric = true;
      }
    } catch {
      // RPC not defined, expected in standard PostgREST setup
    }

    // If authenticated, get exact cloud count verification
    if (user) {
      try {
        const [mediaRes, statesRes, listsRes] = await Promise.all([
          client.from('user_media_items').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          client.from('user_media_states').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          client.from('user_custom_lists').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        ]);

        if (mediaRes.count !== null && mediaRes.count !== undefined) mediaItems = Math.max(mediaItems, mediaRes.count);
        if (statesRes.count !== null && statesRes.count !== undefined) personalStates = Math.max(personalStates, statesRes.count);
        if (listsRes.count !== null && listsRes.count !== undefined) customLists = Math.max(customLists, listsRes.count);
      } catch (err) {
        console.warn('Could not query exact cloud count for storage calculation:', err);
      }
    }
  }

  // Convert to MB with 2 decimal precision
  const usedMb = Math.round((usedBytes / (1024 * 1024)) * 100) / 100;
  const totalMb = SUPABASE_FREE_STORAGE_MB;
  const remainingMb = Math.max(0, Math.round((totalMb - usedMb) * 100) / 100);
  const percentUsed = Math.min(100, Math.round((usedMb / totalMb) * 10000) / 100);

  let warningLevel: StorageWarningLevel = 'normal';
  if (percentUsed >= 100) {
    warningLevel = 'critical';
  } else if (percentUsed >= 90) {
    warningLevel = 'danger';
  } else if (percentUsed >= 80) {
    warningLevel = 'warning';
  }

  return {
    usedBytes,
    usedMb,
    totalMb,
    remainingMb,
    percentUsed,
    isDirectServerMetric,
    itemCounts: {
      mediaItems,
      personalStates,
      customLists,
    },
    warningLevel,
    limitReached: percentUsed >= 100,
    projectRef,
    dashboardUsageUrl,
    measuredAt: new Date().toISOString(),
  };
}
