import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://olvmqirywejembokfujz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sdm1xaXJ5d2VqZW1ib2tmdWp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1ODcyMjEsImV4cCI6MjA5MzE2MzIyMX0.1rIUfEfvw8dHi2syPvflfiFArF6YvgYKOxTNlPzIFdg';

// Use AsyncStorage instead of SecureStore — Supabase session tokens exceed
// SecureStore's 2048-byte limit and will fail in future SDK versions
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
