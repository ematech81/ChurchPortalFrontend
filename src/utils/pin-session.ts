/**
 * Module-level singleton for per-session "Remind me later" PIN setup state.
 * Lives in memory only — reset when the app process restarts.
 * Explicitly cleared on logout via clearPinSetupSkipped().
 */
let _skipped = false;

export const getPinSetupSkipped = () => _skipped;
export const setPinSetupSkipped = () => { _skipped = true; };
export const clearPinSetupSkipped = () => { _skipped = false; };
