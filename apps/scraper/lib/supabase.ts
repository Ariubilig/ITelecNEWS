import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();


const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const missing = [
  !supabaseUrl && "SUPABASE_URL",
  !supabaseSecretKey && "SUPABASE_SERVICE_ROLE_KEY",
].filter(Boolean);

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variable(s): ${missing.join(", ")}. ` +
    `In CI these come from GitHub Actions secrets; locally, put them in apps/scraper/.env`,
  );
}

const supabase = createClient(supabaseUrl, supabaseSecretKey);


export default supabase