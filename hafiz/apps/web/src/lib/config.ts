function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Variable d'environnement manquante : ${name}. Copiez apps/web/.env.example vers apps/web/.env.`,
    );
  }
  return value;
}

export const config = {
  supabaseUrl: required("VITE_SUPABASE_URL", import.meta.env.VITE_SUPABASE_URL),
  supabaseAnonKey: required("VITE_SUPABASE_ANON_KEY", import.meta.env.VITE_SUPABASE_ANON_KEY),
  apiUrl: (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, ""),
};
