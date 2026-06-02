import { createClient } from '@supabase/supabase-js';
import { env } from '@itelecnews/env/server';


// env is validated at import time (see @itelecnews/env). Make sure `process.env`
// is populated first — scrape.ts loads dotenv before anything reaches this module.
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);


export default supabase