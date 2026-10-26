import { createClient } from '@supabase/supabase-js';
import { PUBLIC_OFFLINE_DEMO } from './publicDemo';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabaseConfigured = !PUBLIC_OFFLINE_DEMO && Boolean(url && anonKey);

// Avoid crashing Metro/Web when env is not provided.
// All call sites must guard with `supabaseConfigured` before using network features.
const safeUrl = supabaseConfigured ? url : 'https://example.invalid';
const safeAnonKey = supabaseConfigured ? anonKey : 'public-anon-key';

export const supabase = createClient(safeUrl, safeAnonKey);
