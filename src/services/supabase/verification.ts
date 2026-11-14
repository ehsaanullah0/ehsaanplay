import { SupabaseClient } from '@supabase/supabase-js';
import {
  SupabaseVerificationStatus,
  getSupabaseClient,
  createTestSupabaseClient,
  extractSupabaseProjectRef,
  loadSupabaseConfig,
} from './config';
import { EXPECTED_SCHEMA_VERSION } from './schemaMigration';

function isPausedError(message?: string): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes('paused') ||
    lower.includes('inactive') ||
    lower.includes('503') ||
    lower.includes('service unavailable') ||
    lower.includes('compute instance') ||
    lower.includes('project paused') ||
    lower.includes('dormant') ||
    lower.includes('inactivity') ||
    lower.includes('connection refused')
  );
}

/**
 * Runs a complete diagnostic verification on a Supabase client.
 * Tests connection reachability, schema table existence, schema version,
 * and user table presence.
 */
export async function verifySupabaseDatabase(
  customClient?: SupabaseClient,
  targetUrl?: string
): Promise<SupabaseVerificationStatus> {
  const client = customClient || getSupabaseClient();
  const activeUrl = targetUrl || (client as any)?.supabaseUrl || loadSupabaseConfig()?.url || null;
  const projectRef = extractSupabaseProjectRef(activeUrl);

  if (!client) {
    return {
      reachable: false,
      schemaInstalled: false,
      schemaVersion: null,
      tablesVerified: false,
      authConfigured: false,
      projectRef,
      errorMessage: 'Database not configured. Please enter your Supabase Project URL and Publishable Key.',
    };
  }

  const result: SupabaseVerificationStatus = {
    reachable: false,
    schemaInstalled: false,
    schemaVersion: null,
    tablesVerified: false,
    authConfigured: false,
    isPaused: false,
    projectRef,
    details: {
      schemaTableExists: false,
      mediaTableExists: false,
      statesTableExists: false,
      listsTableExists: false,
      settingsTableExists: false,
    },
  };

  try {
    // 1. Connectivity test: ping auth / health
    const { data: authData, error: authError } = await client.auth.getSession();
    if (authError && authError.message && !authError.message.includes('Auth session missing')) {
      if (isPausedError(authError.message)) {
        result.reachable = false;
        result.isPaused = true;
        result.errorMessage =
          'Project appears paused or inactive. Free-tier Supabase projects pause after inactivity. Please click Resume Database to wake it up in your Supabase dashboard.';
        return result;
      }
      // If error is an invalid key or unreachable domain
      if (authError.message.toLowerCase().includes('apikey') || authError.message.toLowerCase().includes('jwt')) {
        result.errorMessage = `Invalid Publishable Key: ${authError.message}`;
        return result;
      }
    }
    result.reachable = true;
    result.authConfigured = true;

    // 2. Query ehsaan_schema_info to check if our migration script was run
    const { data: schemaRows, error: schemaError } = await client
      .from('ehsaan_schema_info')
      .select('version, applied_at')
      .order('version', { ascending: false })
      .limit(1);

    if (schemaError) {
      if (isPausedError(schemaError.message)) {
        result.reachable = false;
        result.isPaused = true;
        result.errorMessage =
          'Database project is currently paused due to inactivity. Use the Resume Database button to reactivate it in your Supabase console.';
        return result;
      }

      // 404 or relation does not exist means SQL migration has not been run yet
      if (
        schemaError.code === '42P01' || // relation does not exist
        schemaError.message?.toLowerCase().includes('does not exist') ||
        schemaError.message?.toLowerCase().includes('not found') ||
        schemaError.message?.toLowerCase().includes('relation')
      ) {
        result.schemaInstalled = false;
        result.errorMessage =
          'Schema not found: The EhsaanPlay database tables have not been created yet. Please copy the SQL script from Step 4 into your Supabase SQL Editor and run it.';
        return result;
      }
      
      // Could be RLS or permission issue
      result.errorMessage = `Error querying schema: ${schemaError.message}`;
      return result;
    }

    result.details!.schemaTableExists = true;
    const installedVersion = schemaRows && schemaRows.length > 0 ? schemaRows[0].version : null;
    result.schemaVersion = installedVersion;

    if (installedVersion === null) {
      result.errorMessage = 'Schema table found, but no schema version record was returned.';
      return result;
    }

    if (installedVersion !== EXPECTED_SCHEMA_VERSION) {
      result.errorMessage = `Schema version mismatch. Expected v${EXPECTED_SCHEMA_VERSION}, but found v${installedVersion}. Please update your SQL schema.`;
      return result;
    }

    result.schemaInstalled = true;

    // 3. Verify user tables presence (query with limit 0)
    // Because RLS is enabled, queries with limit 0 will succeed (empty array or empty result) if table exists
    const [statesCheck, listsCheck, mediaCheck, settingsCheck] = await Promise.all([
      client.from('user_media_states').select('media_id').limit(0),
      client.from('user_custom_lists').select('id').limit(0),
      client.from('user_media_items').select('id').limit(0),
      client.from('user_app_settings').select('user_id').limit(0),
    ]);

    result.details!.statesTableExists = !statesCheck.error;
    result.details!.listsTableExists = !listsCheck.error;
    result.details!.mediaTableExists = !mediaCheck.error;
    result.details!.settingsTableExists = !settingsCheck.error;

    const allTablesPresent =
      !statesCheck.error && !listsCheck.error && !mediaCheck.error && !settingsCheck.error;

    if (!allTablesPresent) {
      const missing: string[] = [];
      if (statesCheck.error) missing.push('user_media_states');
      if (listsCheck.error) missing.push('user_custom_lists');
      if (mediaCheck.error) missing.push('user_media_items');
      if (settingsCheck.error) missing.push('user_app_settings');

      result.errorMessage = `Some database tables appear missing: ${missing.join(', ')}. Please re-run the complete SQL script in Step 4.`;
      return result;
    }

    result.tablesVerified = true;
    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const paused = isPausedError(errorMsg);
    result.reachable = false;
    result.isPaused = paused;
    result.errorMessage = paused
      ? 'Database project is paused or unavailable. Supabase free projects pause after inactivity. Please click Resume Database to reactivate it.'
      : `Connection test failed: ${errorMsg}`;
    return result;
  }
}

/**
 * Tests connection with ad-hoc URL and Key without saving
 */
export async function testSupabaseConnection(
  url: string,
  key: string
): Promise<SupabaseVerificationStatus> {
  const projectRef = extractSupabaseProjectRef(url);
  try {
    const testClient = createTestSupabaseClient(url, key);
    return await verifySupabaseDatabase(testClient, url);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Invalid connection parameters.';
    const paused = isPausedError(errorMsg);
    return {
      reachable: false,
      schemaInstalled: false,
      schemaVersion: null,
      tablesVerified: false,
      authConfigured: false,
      isPaused: paused,
      projectRef,
      errorMessage: paused
        ? 'Database project appears paused due to inactivity. Click Resume Database to reactivate it in your Supabase dashboard.'
        : errorMsg,
    };
  }
}
