import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const hasPlaceholderValues =
	(supabaseUrl ?? '').includes('YOUR_PROJECT_REF') ||
	(supabaseKey ?? '').includes('YOUR_SUPABASE_ANON_KEY')

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey) && !hasPlaceholderValues

if (!isSupabaseConfigured) {
	console.warn(
		'Supabase is not configured. Set real VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY values in .env and restart the app.'
	)
}

export const supabase = createClient(
	supabaseUrl ?? 'https://placeholder.supabase.co',
	supabaseKey ?? 'placeholder-anon-key',
	{
		auth: {
			persistSession: true,
			autoRefreshToken: true,
			detectSessionInUrl: true,
		},
	}
)

