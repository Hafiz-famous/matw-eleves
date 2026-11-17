/** Traduit les erreurs Supabase Auth en messages français compréhensibles. */
export function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou mot de passe incorrect.";
  if (m.includes("email not confirmed")) return "Veuillez confirmer votre adresse e-mail avant de vous connecter.";
  if (m.includes("user already registered")) return "Un compte existe déjà avec cette adresse e-mail.";
  if (m.includes("password should be at least")) return "Le mot de passe doit contenir au moins 8 caractères.";
  if (m.includes("rate limit") || m.includes("too many")) return "Trop de tentatives. Réessayez dans quelques minutes.";
  if (m.includes("invalid email") || m.includes("unable to validate email")) return "Adresse e-mail invalide.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Impossible de joindre le service d'authentification.";
  return "Une erreur est survenue. Veuillez réessayer.";
}
