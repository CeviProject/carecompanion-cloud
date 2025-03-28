
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://irkihiedlszoufsjglhw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlya2loaWVkbHN6b3Vmc2pnbGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1ODM1MTcsImV4cCI6MjA1ODE1OTUxN30.OSbgbr0LMX_t-Vj_vl0X6aq_TpIwyfhijoA2CKn2bTs";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
