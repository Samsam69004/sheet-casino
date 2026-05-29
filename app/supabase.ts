import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Blocage volontaire pour éviter des erreurs silencieuses dans l'app
  throw new Error(
    "STOP ! Clés Supabase manquantes.\n" +
    "1. Vérifie que le fichier .env.local est à la RACINE du projet (pas dans /app).\n" +
    "2. COUPE ton terminal (Ctrl+C) et RELANCE 'npm run dev' pour appliquer les changements."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
