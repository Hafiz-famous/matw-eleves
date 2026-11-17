import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AuthLayout, inputClass, primaryButtonClass } from "../components/AuthLayout";
import { AlertIcon } from "../components/Icons";
import { Spinner } from "../components/Spinner";
import { useAuth } from "../contexts/AuthContext";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const { signUp, session } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null);

  if (session) return <Navigate to="/chat" replace />;

  function validate(): string | null {
    if (name.trim().length < 2) return "Indiquez votre nom (2 caractères minimum).";
    if (!EMAIL_RE.test(email.trim())) return "Adresse e-mail invalide.";
    if (password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
    if (password !== confirm) return "Les mots de passe ne correspondent pas.";
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const invalid = validate();
    if (invalid) return setError(invalid);
    setError(null);
    setSubmitting(true);
    try {
      const { needsConfirmation } = await signUp(email.trim(), password, name.trim());
      if (needsConfirmation) setConfirmationSentTo(email.trim());
      else navigate("/chat", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmationSentTo) {
    return (
      <AuthLayout title="Vérifiez votre e-mail" subtitle="Plus qu'une étape avant de discuter avec HAFIZ.">
        <p className="text-sm leading-6 text-slate-600">
          Un lien de confirmation a été envoyé à <strong className="text-night-900">{confirmationSentTo}</strong>.
          Cliquez dessus pour activer votre compte, puis connectez-vous.
        </p>
        <Link to="/connexion" className={`${primaryButtonClass} mt-6`}>
          Aller à la connexion
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Créer un compte" subtitle="Rejoignez HAFIZ gratuitement en quelques secondes.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-night-800">Nom</label>
          <input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)}
            className={inputClass} placeholder="Votre nom" />
        </div>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-night-800">Adresse e-mail</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className={inputClass} placeholder="vous@exemple.com" />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-night-800">Mot de passe</label>
          <input id="password" type="password" autoComplete="new-password" value={password}
            onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="8 caractères minimum" />
        </div>
        <div>
          <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-night-800">Confirmer le mot de passe</label>
          <input id="confirm" type="password" autoComplete="new-password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} className={inputClass} placeholder="••••••••" />
        </div>
        <button type="submit" disabled={submitting} className={primaryButtonClass}>
          {submitting && <Spinner className="h-4 w-4" />} Créer mon compte
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Déjà inscrit ?{" "}
        <Link to="/connexion" className="font-semibold text-electric-600 hover:underline">Se connecter</Link>
      </p>
    </AuthLayout>
  );
}
