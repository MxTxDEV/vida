import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let client: SupabaseClient | null = null

/** The browser client, or null when Supabase is not configured. */
export function getSupabase() {
	if (!url || !key || typeof window === 'undefined') return null
	client ??= createClient(url, key)
	return client
}

export const syncConfigured = Boolean(url && key)
