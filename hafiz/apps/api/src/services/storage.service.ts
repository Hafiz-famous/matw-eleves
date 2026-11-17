import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";

/**
 * Accès à Supabase Storage côté serveur (clé service_role, jamais exposée au
 * client). Les fichiers sont rangés par utilisateur : `<userId>/<chemin>`.
 * Prêt pour les prochaines fonctionnalités (pièces jointes, avatars…).
 */
let client: SupabaseClient | null = null;

function storage() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new AppError(503, "STORAGE_DISABLED", "Le stockage de fichiers n'est pas configuré.");
  }
  client ??= createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client.storage.from(env.SUPABASE_STORAGE_BUCKET);
}

function userPath(userId: string, path: string) {
  const clean = path.replace(/^\/+/, "").replace(/\.\.+/g, "");
  if (!clean) throw AppError.badRequest("Chemin de fichier invalide");
  return `${userId}/${clean}`;
}

export const storageService = {
  async upload(userId: string, path: string, data: Buffer, contentType: string) {
    const fullPath = userPath(userId, path);
    const { error } = await storage().upload(fullPath, data, { contentType, upsert: true });
    if (error) throw new AppError(502, "STORAGE_ERROR", "Échec de l'envoi du fichier.");
    return fullPath;
  },

  async signedUrl(userId: string, path: string, expiresInSeconds = 3600) {
    const { data, error } = await storage().createSignedUrl(userPath(userId, path), expiresInSeconds);
    if (error || !data) throw AppError.notFound("Fichier introuvable");
    return data.signedUrl;
  },

  async remove(userId: string, path: string) {
    const { error } = await storage().remove([userPath(userId, path)]);
    if (error) throw new AppError(502, "STORAGE_ERROR", "Échec de la suppression du fichier.");
  },
};
