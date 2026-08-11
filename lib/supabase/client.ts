import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

declare global {
  var paginaCredSupabase:
    | SupabaseClient
    | undefined;
}

export function createClient(): SupabaseClient {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Faltan las variables de entorno de Supabase.",
    );
  }

  if (!globalThis.paginaCredSupabase) {
    globalThis.paginaCredSupabase =
      createBrowserClient(
        supabaseUrl,
        supabaseAnonKey,
      );
  }

  return globalThis.paginaCredSupabase;
}
