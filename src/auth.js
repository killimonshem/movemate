// src/auth.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required environment variables: REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY must be set in .env file');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Get current session (async)
export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
};

// Listen for auth state changes
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
};

// Sign in with Google
export const signInWithGoogle = async () => {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  });
};

// Sign out
export const signOut = async () => {
  return supabase.auth.signOut();
};

// Get user profile (from Supabase user object)
export const getUser = () => {
  return supabase.auth.getUser().then(({ data }) => data.user);
};

// Upsert member profile after login
export const upsertMemberProfile = async (user) => {
  if (!user) return;
  const { email, id, app_metadata } = user;
  const provider = app_metadata?.provider || 'google';
  // Upsert by social_id (Supabase user id)
  const { error } = await supabase.from('members').upsert([
    {
      email,
      social_id: id,
      social_provider: provider,
    }
  ], { onConflict: 'social_id' });
  return { error };
};

// Minimal sign up with email/password only
export const signUpWithEmail = async (email, password) => {
  return supabase.auth.signUp({ email, password });
};

// Sign in with email/password
export const signInWithEmail = async (email, password) => {
  return supabase.auth.signInWithPassword({ email, password });
}; 