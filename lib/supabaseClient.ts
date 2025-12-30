import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { safeNull } from '../utils/safeNull';

const url = safeNull(Constants.expoConfig?.extra?.supabaseUrl, '');
const key = safeNull(Constants.expoConfig?.extra?.supabaseAnonKey, '');

// Supabase is disabled if keys are missing or placeholder
export const supabaseEnabled =
  !!url && !!key && typeof url === 'string' && typeof key === 'string' && 
  !url.includes("YOUR_SUPABASE_URL") && !key.includes("YOUR_SUPABASE_ANON_KEY") &&
  url.length > 0 && key.length > 0;

export const supabase = supabaseEnabled && url && key
  ? createClient(url as string, key as string, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

