import { createClient } from '@supabase/supabase-js';
import { env } from '@itelecnews/env/web';


// env is validated by @itelecnews/env; presence + URL shape are guaranteed here.
export const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY,
);