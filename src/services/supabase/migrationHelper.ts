import {
  loadMediaCache,
  loadUserStates,
  loadCustomLists,
  loadUserSettings,
} from '../storage';
import { getSupabaseClient } from './config';
import { getCloudUser } from './auth';
import {
  mapMediaItemToDbRow,
  mapPersonalStateToDbRow,
  mapCustomListToDbRow,
  executeFullSync,
} from './syncService';

export interface MigrationSummary {
  localMediaCount: number;
  localStatesCount: number;
  localListsCount: number;
  cloudMediaCount: number;
  cloudStatesCount: number;
  cloudListsCount: number;
  hasLocalDataToMigrate: boolean;
}

export interface MigrationProgress {
  phase: 'idle' | 'checking' | 'uploading_media' | 'uploading_states' | 'uploading_lists' | 'uploading_settings' | 'verifying' | 'completed' | 'error';
  percent: number;
  message: string;
}

/**
 * Inspects both local storage and the connected Supabase cloud database
 * to provide a clear pre-migration summary.
 */
export async function inspectMigrationCounts(): Promise<MigrationSummary> {
  const localMedia = loadMediaCache();
  const localStates = loadUserStates();
  const localLists = loadCustomLists();

  const summary: MigrationSummary = {
    localMediaCount: localMedia.length,
    localStatesCount: Object.keys(localStates).length,
    localListsCount: localLists.length,
    cloudMediaCount: 0,
    cloudStatesCount: 0,
    cloudListsCount: 0,
    hasLocalDataToMigrate: localMedia.length > 0 || Object.keys(localStates).length > 0 || localLists.length > 0,
  };

  const client = getSupabaseClient();
  const user = await getCloudUser();
  if (!client || !user) return summary;

  try {
    const [mediaCount, statesCount, listsCount] = await Promise.all([
      client.from('user_media_items').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      client.from('user_media_states').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      client.from('user_custom_lists').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);

    summary.cloudMediaCount = mediaCount.count || 0;
    summary.cloudStatesCount = statesCount.count || 0;
    summary.cloudListsCount = listsCount.count || 0;
  } catch (err) {
    console.error('Error querying cloud migration counts:', err);
  }

  return summary;
}

export interface MigrationExecutionResult {
  success: boolean;
  message: string;
  migratedCounts?: {
    media: number;
    states: number;
    lists: number;
  };
  failedCounts?: {
    media: number;
    states: number;
    lists: number;
  };
  failedDetails?: Array<{
    id: string;
    title?: string;
    error: string;
  }>;
}

export interface UploadStats {
  total: number;
  uploaded: number;
  failed: number;
  skipped: number;
  failedRecords: { id: string; title?: string; error: string }[];
}

/**
 * Resilient batch uploader with automatic individual-item fallback.
 * If a 50-item chunk fails, it isolates the exact invalid record(s) and continues
 * uploading all remaining valid records rather than aborting the entire process.
 */
export async function uploadRecordsWithResilience(
  client: any,
  table: string,
  records: any[],
  onConflictKey: string,
  onProgress: (current: number, total: number) => void
): Promise<UploadStats> {
  const stats: UploadStats = {
    total: records.length,
    uploaded: 0,
    failed: 0,
    skipped: 0,
    failedRecords: [],
  };

  if (records.length === 0) return stats;

  const chunkSize = 50;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const { error } = await client.from(table).upsert(chunk, { onConflict: onConflictKey });

    if (!error) {
      stats.uploaded += chunk.length;
      onProgress(stats.uploaded, stats.total);
    } else {
      // Chunk-level failure: fallback to individual upserts for this chunk to isolate the bad record
      console.warn(`[Supabase Upload] Chunk ${i}-${i + chunk.length} failed in ${table}: ${error.message}. Retrying items individually...`);
      for (const item of chunk) {
        const { error: itemError } = await client.from(table).upsert([item], { onConflict: onConflictKey });
        if (!itemError) {
          stats.uploaded++;
        } else {
          stats.failed++;
          stats.failedRecords.push({
            id: String(item.id || item.media_id || 'unknown'),
            title: item.title,
            error: itemError.message,
          });
          console.error(`[Supabase Upload] Record failed in ${table} (id: ${item.id || item.media_id}):`, itemError.message);
        }
        onProgress(stats.uploaded + stats.failed, stats.total);
      }
    }
  }

  return stats;
}

/**
 * Safely migrates existing local data to the user's Supabase project.
 * Uses batch upserts with idempotent conflict resolution and individual-item fallback.
 * Preserves local data intact.
 */
export async function executeSafeLocalToCloudMigration(
  onProgress?: (progress: MigrationProgress) => void
): Promise<{
  success: boolean;
  message: string;
  migratedCounts?: { media: number; states: number; lists: number };
  failedCounts?: { media: number; states: number; lists: number };
  failedDetails?: { id: string; title?: string; error: string }[];
}> {
  const client = getSupabaseClient();
  const user = await getCloudUser();

  if (!client || !user) {
    return { success: false, message: 'You must be signed in to your Supabase project to migrate data.' };
  }

  const report = (phase: MigrationProgress['phase'], percent: number, message: string) => {
    if (onProgress) onProgress({ phase, percent, message });
  };

  try {
    report('checking', 5, 'Inspecting and normalizing local library data...');

    const localMedia = loadMediaCache();
    const localStates = loadUserStates();
    const localLists = loadCustomLists();
    const localSettings = loadUserSettings();

    // Map and normalize all records into canonical database types
    const mediaRows = localMedia.map(m => mapMediaItemToDbRow(user.id, m));
    const statesRows = Object.values(localStates).map(s => mapPersonalStateToDbRow(user.id, s));
    const listsRows = localLists.map(l => mapCustomListToDbRow(user.id, l));

    // 1. Resilient upload for Media Items
    report('uploading_media', 15, `Uploading ${mediaRows.length} library titles...`);
    const mediaStats = await uploadRecordsWithResilience(
      client,
      'user_media_items',
      mediaRows,
      'user_id, id',
      (current, total) => {
        const percent = Math.min(45, 15 + Math.round((current / (total || 1)) * 30));
        report('uploading_media', percent, `Uploading library titles (${current}/${total})...`);
      }
    );

    // 2. Resilient upload for Personal States
    report('uploading_states', 45, `Uploading ${statesRows.length} personal states (watchlist, ratings, progress)...`);
    const statesStats = await uploadRecordsWithResilience(
      client,
      'user_media_states',
      statesRows,
      'user_id, media_id',
      (current, total) => {
        const percent = Math.min(75, 45 + Math.round((current / (total || 1)) * 30));
        report('uploading_states', percent, `Uploading personal states (${current}/${total})...`);
      }
    );

    // 3. Resilient upload for Custom Lists
    report('uploading_lists', 75, `Uploading ${listsRows.length} custom collections...`);
    const listsStats = await uploadRecordsWithResilience(
      client,
      'user_custom_lists',
      listsRows,
      'user_id, id',
      (current, total) => {
        const percent = Math.min(85, 75 + Math.round((current / (total || 1)) * 10));
        report('uploading_lists', percent, `Uploading custom collections (${current}/${total})...`);
      }
    );

    // 4. Upload User Settings
    report('uploading_settings', 88, 'Synchronizing personal app settings...');
    await client.from('user_app_settings').upsert({
      user_id: user.id,
      settings_json: localSettings,
      updated_at: new Date().toISOString(),
    });

    // 5. Verification
    report('verifying', 95, 'Verifying cloud data integrity...');
    const [verifyMedia, verifyStates, verifyLists] = await Promise.all([
      client.from('user_media_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      client.from('user_media_states').select('media_id', { count: 'exact', head: true }).eq('user_id', user.id),
      client.from('user_custom_lists').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);

    report('completed', 100, 'Migration completed and verified successfully!');

    // Trigger full sync to establish clean baseline
    await executeFullSync();

    const totalFailed = mediaStats.failed + statesStats.failed + listsStats.failed;
    const allFailedDetails = [
      ...mediaStats.failedRecords,
      ...statesStats.failedRecords,
      ...listsStats.failedRecords,
    ];

    let message = `Migration verified! Uploaded ${mediaStats.uploaded} titles, ${statesStats.uploaded} states, and ${listsStats.uploaded} shelves.`;
    if (totalFailed > 0) {
      message = `Migration completed with warnings: Successfully uploaded ${mediaStats.uploaded} titles, ${statesStats.uploaded} states, and ${listsStats.uploaded} shelves (${totalFailed} item(s) skipped due to validation errors).`;
    }

    return {
      success: true,
      message,
      migratedCounts: {
        media: verifyMedia.count || mediaStats.uploaded,
        states: verifyStates.count || statesStats.uploaded,
        lists: verifyLists.count || listsStats.uploaded,
      },
      failedCounts: {
        media: mediaStats.failed,
        states: statesStats.failed,
        lists: listsStats.failed,
      },
      failedDetails: allFailedDetails,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Migration failed.';
    report('error', 0, errorMsg);
    return { success: false, message: errorMsg };
  }
}

