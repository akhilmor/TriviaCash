import { supabase, supabaseEnabled } from "../../lib/supabaseClient";

export function useSupabase() {
  return { supabase, supabaseEnabled };
}

// Prevent route warnings - this file is not a route
export default function Placeholder() {
  return null;
}

