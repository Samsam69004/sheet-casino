import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Extraction ultra-robuste de l'origine (ex: https://xyz.supabase.co)
// Cela supprime /rest/v1, les slashs de fin ou les paramètres, peu importe le format en prod.
let supabaseUrl = '';
if (rawUrl) {
  try {
    const cleanUrl = rawUrl.trim().startsWith('http') ? rawUrl.trim() : `https://${rawUrl.trim()}`;
    supabaseUrl = new URL(cleanUrl).origin;
  } catch (e) {
    supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").trim();
  }
}

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
