/**
 * CodeCoach Academy — Auth & Progress Module
 * Uses Supabase for auth + cloud progress storage.
 * Falls back to localStorage-only if Supabase isn't configured.
 *
 * HOW TO CONFIGURE:
 *   1. Go to https://app.supabase.com → New Project
 *   2. Settings → API → copy "Project URL" and "anon public" key
 *   3. Create a netlify.toml or set env vars:
 *        SUPABASE_URL=https://xxxx.supabase.co
 *        SUPABASE_ANON_KEY=eyJ...
 *   4. Run supabase/schema.sql in the Supabase SQL editor once
 */

// ── CONFIG ──────────────────────────────────────────────────────────────────
// These are replaced at build time by Netlify env vars (see netlify.toml).
// For local dev, edit these strings directly or use a .env approach.
const SUPABASE_URL      = window.__ENV__?.SUPABASE_URL      || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = window.__ENV__?.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// ── INIT ─────────────────────────────────────────────────────────────────────
let _supabase = null;
const isConfigured = SUPABASE_URL !== 'YOUR_SUPABASE_URL';

if (isConfigured && window.supabase) {
  try {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn('[CodeCoach] Supabase init failed:', e.message);
  }
}

// ── AUTH ─────────────────────────────────────────────────────────────────────

/** Returns current session user or null */
async function getUser() {
  if (_supabase) {
    const { data: { session } } = await _supabase.auth.getSession();
    return session?.user ?? null;
  }
  const raw = localStorage.getItem('cc_user');
  return raw ? JSON.parse(raw) : null;
}

/** Sign in with email/password */
async function signIn(email, password) {
  if (_supabase) {
    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data.user;
  }
  // localStorage fallback
  const user = { id: 'local-' + btoa(email), email, user_metadata: { full_name: email.split('@')[0] } };
  localStorage.setItem('cc_user', JSON.stringify(user));
  return user;
}

/** Sign up with email/password + display name */
async function signUp(email, password, fullName) {
  if (_supabase) {
    const { data, error } = await _supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } }
    });
    if (error) throw new Error(error.message);
    // If email confirmation required, session will be null
    return { user: data.user, needsConfirmation: !data.session };
  }
  const user = { id: 'local-' + btoa(email), email, user_metadata: { full_name: fullName } };
  localStorage.setItem('cc_user', JSON.stringify(user));
  return { user, needsConfirmation: false };
}

/** OAuth — Google (requires Supabase + provider enabled in dashboard) */
async function signInWithGoogle() {
  if (!_supabase) throw new Error('Google auth requires Supabase. See README.md');
  const { error } = await _supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  });
  if (error) throw new Error(error.message);
}

/** Sign out */
async function signOut() {
  if (_supabase) await _supabase.auth.signOut();
  localStorage.removeItem('cc_user');
}

/** Listen to auth changes — cb(user | null) */
function onAuthChange(cb) {
  if (_supabase) {
    _supabase.auth.onAuthStateChange((_event, session) => cb(session?.user ?? null));
  }
}

// ── PROGRESS ──────────────────────────────────────────────────────────────────

/** Load progress for a course. Returns {} if none. */
async function loadProgress(courseId) {
  const key = 'cc_progress_' + courseId;
  const local = JSON.parse(localStorage.getItem(key) || '{}');

  if (_supabase) {
    const user = await getUser();
    if (!user) return local;
    const { data } = await _supabase
      .from('user_progress')
      .select('progress_data')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();
    if (data?.progress_data) {
      // Merge: cloud wins on XP, union completed modules
      const cloud = data.progress_data;
      const merged = {
        xp: Math.max(local.xp || 0, cloud.xp || 0),
        streak: Math.max(local.streak || 0, cloud.streak || 0),
        completed: { ...(local.completed || {}), ...(cloud.completed || {}) },
        lastSeen: cloud.lastSeen || local.lastSeen
      };
      localStorage.setItem(key, JSON.stringify(merged));
      return merged;
    }
  }
  return local;
}

/** Save progress for a course. Writes locally always; writes to Supabase if authed. */
async function saveProgress(courseId, data) {
  const key = 'cc_progress_' + courseId;
  localStorage.setItem(key, JSON.stringify(data));

  if (_supabase) {
    const user = await getUser();
    if (!user) return;
    await _supabase.from('user_progress').upsert({
      user_id: user.id,
      course_id: courseId,
      progress_data: data,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,course_id' });
  }
}

/** Get display name from user object */
function getDisplayName(user) {
  if (!user) return 'Guest';
  return user.user_metadata?.full_name || user.email?.split('@')[0] || 'Learner';
}

/** Is Supabase configured? */
function isSupabaseReady() { return !!_supabase; }

// Export to window for plain-HTML pages
window.CC = {
  getUser, signIn, signUp, signInWithGoogle, signOut, onAuthChange,
  loadProgress, saveProgress, getDisplayName, isSupabaseReady
};
