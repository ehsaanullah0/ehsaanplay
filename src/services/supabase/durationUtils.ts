/**
 * Duration parsing and normalization utilities for EhsaanPlay.
 * 
 * Normalizes media duration strings and numbers into canonical integer seconds
 * for Supabase database storage (e.g., "29 min" -> 1740, "1 hr 20 min" -> 4800).
 * 
 * Converts canonical database seconds back into minutes for UI components and calculation.
 */

/**
 * Normalizes any duration representation into integer seconds.
 * 
 * Handles formats such as:
 * - "29 min" / "29 mins" / "29 minutes" -> 1740
 * - "1 hr 20 min" / "1h 20m" / "1 hour 20 minutes" -> 4800
 * - "45 sec" / "45s" -> 45
 * - "2 hr 15 min" -> 8100
 * - "01:25:30" (hh:mm:ss) -> 5130
 * - "45:00" (mm:ss) -> 2700
 * - "PT1H20M" (ISO 8601 duration) -> 4800
 * - Numeric duration (e.g. 120):
 *     If <= 600, treated as minutes (standard movie runtime format) -> 120 * 60 = 7200 sec
 *     If > 600, treated as already in seconds -> 1740 sec
 * 
 * Returns null if missing, empty, or unparseable.
 */
export function normalizeDurationToSeconds(input: unknown): number | null {
  if (input === null || input === undefined) {
    return null;
  }

  // 1. Numeric duration
  if (typeof input === 'number') {
    if (isNaN(input) || input <= 0 || !isFinite(input)) {
      return null;
    }
    // In EhsaanPlay & film metadata, runtimes <= 600 represent minutes (e.g. 90 min, 120 min).
    // Values > 600 represent seconds (e.g. 1740 sec for 29 min, 4800 sec for 1h 20m).
    const rounded = Math.round(input);
    if (rounded <= 600) {
      return rounded * 60;
    }
    return rounded;
  }

  // 2. String duration
  if (typeof input === 'string') {
    const raw = input.trim();
    if (!raw || raw.toLowerCase() === 'n/a' || raw.toLowerCase() === 'none' || raw.toLowerCase() === 'unknown') {
      return null;
    }

    const lower = raw.toLowerCase();

    // A. ISO 8601 Duration (e.g. PT1H20M, PT45M, PT2H15M30S)
    if (lower.startsWith('pt')) {
      const hoursMatch = lower.match(/(\d+)h/);
      const minutesMatch = lower.match(/(\d+)m/);
      const secondsMatch = lower.match(/(\d+)s/);
      let total = 0;
      if (hoursMatch) total += parseInt(hoursMatch[1], 10) * 3600;
      if (minutesMatch) total += parseInt(minutesMatch[1], 10) * 60;
      if (secondsMatch) total += parseInt(secondsMatch[1], 10);
      return total > 0 ? total : null;
    }

    // B. Clock time format (e.g. "01:20:00" or "02:15:30" or "45:30")
    if (raw.includes(':') && /^(\d{1,2}:){1,2}\d{2}$/.test(raw)) {
      const parts = raw.split(':').map(p => parseInt(p, 10));
      if (parts.some(isNaN)) return null;
      if (parts.length === 3) {
        // hh:mm:ss
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
      if (parts.length === 2) {
        // mm:ss
        return parts[0] * 60 + parts[1];
      }
    }

    // C. Natural language unit format: "1 hr 20 min", "29 min", "45 sec", "2 hours 15 mins"
    let totalSeconds = 0;
    let foundUnits = false;

    // Hours match
    const hoursMatch = lower.match(/(\d+)\s*(?:h|hr|hrs|hour|hours)\b/);
    if (hoursMatch) {
      totalSeconds += parseInt(hoursMatch[1], 10) * 3600;
      foundUnits = true;
    }

    // Minutes match
    const minutesMatch = lower.match(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/);
    if (minutesMatch) {
      totalSeconds += parseInt(minutesMatch[1], 10) * 60;
      foundUnits = true;
    }

    // Seconds match
    const secondsMatch = lower.match(/(\d+)\s*(?:s|sec|secs|second|seconds)\b/);
    if (secondsMatch) {
      totalSeconds += parseInt(secondsMatch[1], 10);
      foundUnits = true;
    }

    if (foundUnits) {
      return totalSeconds > 0 ? totalSeconds : null;
    }

    // D. Digits only string: "120" or "29"
    const digitsOnlyMatch = raw.match(/^\d+$/);
    if (digitsOnlyMatch) {
      const num = parseInt(raw, 10);
      if (num <= 0) return null;
      if (num <= 600) {
        return num * 60; // minutes to seconds
      }
      return num; // already in seconds
    }
  }

  return null;
}

/**
 * Converts canonical database seconds back into minutes for UI components.
 * 
 * Example:
 * - 4800 seconds -> 80 minutes
 * - 1740 seconds -> 29 minutes
 */
export function secondsToMinutes(seconds: number | null | undefined): number | undefined {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds <= 0) {
    return undefined;
  }
  return Math.round(seconds / 60);
}

/**
 * Formats canonical database seconds into human-readable duration display.
 * 
 * Examples:
 * - 4800 seconds -> "1h 20m"
 * - 1740 seconds -> "29m"
 * - 45 seconds -> "45s"
 */
export function formatSecondsToDisplay(seconds: number | null | undefined): string {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds <= 0) {
    return '';
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSecs = seconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${remainingSecs}s`;
}
