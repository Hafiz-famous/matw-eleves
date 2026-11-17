import { Link } from "react-router-dom";
import { Logo } from "../components/Logo";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 bg-night-950 px-5 text-center text-white">
      <Logo size={48} />
      <h1 className="text-3xl font-bold">Page introuvable</h1>
      <p className="text-slate-400">La page que vous cherchez n'existe pas ou a été déplacée.</p>
      <Link to="/" className="rounded-xl bg-electric-500 px-5 py-2.5 font-semibold hover:bg-electric-600">
        Retour à l'accueil
      </Link>
    </div>
  );
}
