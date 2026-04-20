import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

/**
 * Supabase Client
 * 
 * If environment variables are not set (VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY),
 * the system will gracefully fall back to using mock data from the local data store.
 * 
 * To enable Supabase integration:
 * 1. Create a .env.local file in the project root
 * 2. Add your Supabase credentials:
 *    VITE_SUPABASE_URL=https://your-project.supabase.co
 *    VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-publishable-key
 * 3. Restart the dev server
 */

let supabase = null;

// Only initialize Supabase if both URL and key are provided
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✓ Supabase client initialized with environment variables');
  } catch (error) {
    console.warn('⚠ Failed to initialize Supabase client:', error);
    console.warn('Falling back to mock data from local storage');
    supabase = null;
  }
} else {
  console.warn('⚠ Supabase environment variables not found');
  console.warn('   Using mock data as fallback');
  console.warn('   Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY to enable Supabase');
}

export const  supabase = createClient(supabaseUrl, supabaseKey);