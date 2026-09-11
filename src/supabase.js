// src/supabase.js

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xejgypblblaqtmeqgjfi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhlamd5cGJsYmxhcXRtZXFnamZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMzg2NzEsImV4cCI6MjA5NDgxNDY3MX0.rcC22kV1MXd8eLzzCS0TPyDYw9m8Bf6PRoP57u7lXtQ'

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)