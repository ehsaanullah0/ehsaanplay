import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  publishableKey: string;
  configuredAt: string;
  verifiedAt?: string;
  lastSyncAt?: string;
}

export interface SupabaseVerificationStatus {
  reachable: boolean;
  schemaInstalled: boolean;
  schemaVersion: number | null;
  tablesVerified: boolean;
  authConfigured: boolean;
  isPaused?: boolean;
  projectRef?: string | null;
  errorMessage?: string;
  details?: {
    schemaTableExists: boolean;
    mediaTableExists: boolean;
    statesTableExists: boolean;
    listsTableExists: boolean;
    settingsTableExists: boolean;
  };
}

export type SyncState =
  | 'not_configured'
  | 'disconnected'
  | 'connecting'
  | 'connected_unauthenticated'
  | 'ready'
  | 'syncing'
  | 'sync_active'
  | 'paused'
  | 'offline_pending'
  | 'error';

const STORAGE_KEYS = {
  CONFIG: 'ehsaan_supabase_config_v1',
  LAST_SYNC: 'ehsaan_supabase_last_sync_v1',
  OFFLINE_QUEUE: 'ehsaan_supabase_offline_queue_v1',
  CACHED_USER: 'ehsaan_supabase_cached_user_v1',
  SYNC_PAUSED_UNTIL: 'ehsaan_supabase_sync_paused_until_v1',
};

let cachedClient: SupabaseClient | null = null;
let currentClientKey = '';

/**
 * Validates a Supabase Project URL
 */
export function isValidSupabaseUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    // Must look like https://<project-ref>.supabase.co or custom domain
    return parsed.hostname.length > 3 && (parsed.hostname.includes('supabase.co') || parsed.hostname.includes('.'));
  } catch {
    return false;
  }
}

/**
 * Extracts the project reference ID from a Supabase URL
 * e.g. "https://abcdefghijklm.supabase.co" -> "abcdefghijklm"
 */
export function extractSupabaseProjectRef(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname;
    if (host.includes('.supabase.co')) {
      const parts = host.split('.');
      return parts[0] || null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Returns the direct Supabase Dashboard URL for a project or the main dashboard
 */
export function getSupabaseDashboardUrl(urlOrRef?: string | null): string {
  if (!urlOrRef) return 'https://supabase.com/dashboard';
  const ref = urlOrRef.includes('http') ? extractSupabaseProjectRef(urlOrRef) : urlOrRef.trim();
  if (ref) {
    return `https://supabase.com/dashboard/project/${ref}`;
  }
  return 'https://supabase.com/dashboard';
}

/**
 * Returns the Supabase project database/usage settings dashboard URL
 */
export function getSupabaseUsageDashboardUrl(urlOrRef?: string | null): string {
  if (!urlOrRef) return 'https://supabase.com/dashboard';
  const ref = urlOrRef.includes('http') ? extractSupabaseProjectRef(urlOrRef) : urlOrRef.trim();
  if (ref) {
    return `https://supabase.com/dashboard/project/${ref}/settings/database`;
  }
  return 'https://supabase.com/dashboard';
}

/**
 * Validates a Supabase Publishable Key
 */
export function isValidPublishableKey(key: string): { valid: boolean; message?: string } {
  if (!key || typeof key !== 'string') {
    return { valid: false, message: 'Publishable key cannot be empty.' };
  }
  const trimmed = key.trim();

  // Reject service role / secret keys to protect user security
  if (trimmed.startsWith('sb_secret_') || trimmed.includes('service_role') || trimmed.toLowerCase().includes('secret')) {
    return {
      valid: false,
      message: 'Security warning: Do NOT enter a service_role or secret key. Only use your public/anon/publishable key.',
    };
  }

  // Supabase publishable keys start with sb_publishable_ or are JWTs starting with eyJ
  if (trimmed.startsWith('sb_publishable_') || trimmed.startsWith('eyJ') || trimmed.length >= 20) {
    return { valid: true };
  }

  return { valid: false, message: 'Invalid key format. Expected a Supabase publishable key (sb_publishable_... or anon JWT).' };
}

/**
 * Loads stored Supabase credentials
 */
export function loadSupabaseConfig(): SupabaseConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.url === 'string' && typeof parsed.publishableKey === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Saves Supabase credentials to local storage
 */
export function saveSupabaseConfig(config: SupabaseConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    // Reset client cache so new config takes effect
    cachedClient = null;
    currentClientKey = '';
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ehsaan:supabase-config-change', { detail: config }));
    }
  } catch (err) {
    console.error('Failed to save Supabase config:', err);
  }
}

/**
 * Clears stored Supabase credentials
 */
export function clearSupabaseConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.CONFIG);
    localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
    localStorage.removeItem(STORAGE_KEYS.CACHED_USER);
    localStorage.removeItem(STORAGE_KEYS.SYNC_PAUSED_UNTIL);
    cachedClient = null;
    currentClientKey = '';
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ehsaan:supabase-config-change', { detail: null }));
    }
  } catch (err) {
    console.error('Failed to clear Supabase config:', err);
  }
}

/**
 * Converts a YYYY-MM-DD date string or ISO timestamp into an ISO timestamp for pause expiry.
 * Future calendar dates resolve to 00:00:00 local time on that date (so "Pause until Nov 20" resumes when Nov 20 starts).
 * Selecting today's date resolves to 23:59:59.999 local time today (pauses for the rest of today).
 */
export function parsePauseDateToIso(dateInput: string | null | undefined, nowMs: number = Date.now()): string | null {
  if (!dateInput || typeof dateInput !== 'string') return null;
  const trimmed = dateInput.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [yearStr, monthStr, dayStr] = trimmed.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);
    const targetStart = new Date(year, month, day, 0, 0, 0, 0);
    if (isNaN(targetStart.getTime())) return null;

    const nowDate = new Date(nowMs);
    const todayStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), 0, 0, 0, 0);
    if (targetStart.getTime() === todayStart.getTime()) {
      const todayEnd = new Date(year, month, day, 23, 59, 59, 999);
      return todayEnd.getTime() > nowMs ? todayEnd.toISOString() : null;
    }
    return targetStart.getTime() > nowMs ? targetStart.toISOString() : null;
  }

  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime()) || parsed.getTime() <= nowMs) return null;
  return parsed.toISOString();
}

/**
 * Returns the ISO timestamp until which cloud sync is paused, or null if active/expired.
 * Automatically clears storage once the chosen date/time has passed.
 */
export function getSyncPausedUntil(nowMs: number = Date.now()): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SYNC_PAUSED_UNTIL);
    if (!raw) return null;
    const parsedMs = new Date(raw).getTime();
    if (isNaN(parsedMs) || parsedMs <= nowMs) {
      localStorage.removeItem(STORAGE_KEYS.SYNC_PAUSED_UNTIL);
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

export function isSyncPaused(nowMs: number = Date.now()): boolean {
  return getSyncPausedUntil(nowMs) !== null;
}

export function setSyncPausedUntil(dateOrIso: string | null, nowMs: number = Date.now()): string | null {
  try {
    if (!dateOrIso) {
      localStorage.removeItem(STORAGE_KEYS.SYNC_PAUSED_UNTIL);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ehsaan:supabase-sync-pause-change', { detail: null }));
      }
      return null;
    }

    const iso = parsePauseDateToIso(dateOrIso, nowMs);
    if (!iso) {
      return null;
    }

    localStorage.setItem(STORAGE_KEYS.SYNC_PAUSED_UNTIL, iso);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ehsaan:supabase-sync-pause-change', { detail: iso }));
    }
    return iso;
  } catch (err) {
    console.error('Failed to persist sync pause date:', err);
    return null;
  }
}

/**
 * Initializes or retrieves the singleton Supabase client
 */
export function getSupabaseClient(): SupabaseClient | null {
  const config = loadSupabaseConfig();
  if (!config || !isValidSupabaseUrl(config.url)) {
    return null;
  }

  const clientKey = `${config.url}::${config.publishableKey}`;
  if (cachedClient && currentClientKey === clientKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url.trim(), config.publishableKey.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'ehsaan_sb_auth_token_v1',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    currentClientKey = clientKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return null;
  }
}

/**
 * Creates an ad-hoc test client for testing uncommitted credentials
 */
export function createTestSupabaseClient(url: string, key: string): SupabaseClient {
  return createClient(url.trim(), key.trim(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
