/* =====================================================================
   Singleton Supabase client. `window.supabase` is attached by the UMD
   <script> tag loaded in index.html BEFORE this module runs — see the
   comment there for why the load order matters.
===================================================================== */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
