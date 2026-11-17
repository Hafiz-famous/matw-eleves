import { APP_TAGLINE } from "@hafiz/shared";
import { Link } from "react-router-dom";
import { BoltIcon, ChatIcon, DevicesIcon, HistoryIcon, ShieldIcon } from "../components/Icons";
import { Logo } from "../components/Logo";
import { useAuth } from "../contexts/AuthContext";

const features = [
  {
    icon: ChatIcon,
    title: "Conversations naturelles",
    text: "Posez vos questions comme à un expert : HAFIZ comprend le contexte et répond clairement.",
  },
  {
    icon: BoltIcon,
    title: "Réponses instantanées",
    text: "Les réponses s'affichent en temps réel, mot après mot, sans attente inutile.",
  },
  {
    icon: HistoryIcon,
    title: "Historique organisé",
    text: "Retrouvez, renommez ou supprimez vos conversations à tout moment.",
  },
  {
    icon: ShieldIcon,
    title: "Données protégées",
    text: "Vos échanges sont privés : seul votre compte peut y accéder.",
  },
];

export default function LandingPage() {
  const { session } = useAuth();
  const ctaTo = session ? "/chat" : "/inscription";

  return (
    <div className="min-h-full bg-night-950 text-white">
      {/* Halo décoratif */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[640px] overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-[-220px] h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-electric-500/25 blur-[120px]" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-2 sm:gap-3">
          {session ? (
            <Link to="/chat" className="rounded-xl bg-electric-500 px-4 py-2 text-sm font-semibold hover:bg-electric-600">
              Ouvrir HAFIZ
            </Link>
          ) : (
            <>
              <Link to="/connexion" className="rounded-xl px-3 py-2 text-sm font-medium text-slate-300 hover:text-white">
                Connexion
              </Link>
              <Link
                to="/inscription"
                className="rounded-xl bg-electric-500 px-4 py-2 text-sm font-semibold hover:bg-electric-600"
              >
                S'inscrire
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-14 text-center sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-electric-500/30 bg-electric-500/10 px-3 py-1 text-xs font-medium text-electric-300">
            <span className="h-1.5 w-1.5 rounded-full bg-electric-400" /> Assistant personnel propulsé par l'IA
          </span>
          <h1 className="mt-6 text-5xl font-extrabold tracking-[0.15em] sm:text-7xl">
            HAF<span className="text-electric-400">I</span>Z
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300 sm:text-xl">{APP_TAGLINE}</p>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">
            Rédaction, explications, organisation, idées… HAFIZ vous accompagne au quotidien avec des
            réponses fiables et bien structurées.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to={ctaTo}
              className="w-full rounded-xl bg-electric-500 px-6 py-3 text-base font-semibold shadow-lg shadow-electric-500/30 transition hover:bg-electric-600 sm:w-auto"
            >
              {session ? "Continuer vers mes conversations" : "Commencer gratuitement"}
            </Link>
            {!session && (
              <Link
                to="/connexion"
                className="w-full rounded-xl border border-white/15 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/5 sm:w-auto"
              >
                J'ai déjà un compte
              </Link>
            )}
          </div>

          {/* Aperçu de l'interface */}
          <div className="mx-auto mt-16 max-w-3xl rounded-2xl border border-white/10 bg-night-900/80 p-4 text-left shadow-2xl shadow-black/40 backdrop-blur sm:p-6">
            <div className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-electric-500 px-4 py-2.5 text-sm">
                Peux-tu m'aider à organiser ma semaine de révisions ?
              </p>
            </div>
            <div className="mt-4 flex gap-3">
              <img src="/logo.svg" alt="" className="h-8 w-8 shrink-0 rounded-lg" />
              <div className="rounded-2xl rounded-tl-md bg-night-800 px-4 py-3 text-sm text-slate-200">
                Bien sûr ! Voici une proposition équilibrée :
                <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
                  <li>Lundi & mercredi : matières principales (2 h)</li>
                  <li>Mardi & jeudi : exercices pratiques (1 h 30)</li>
                  <li>Vendredi : révision générale et fiches</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">Pourquoi choisir HAFIZ ?</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-night-900/60 p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-electric-500/15 text-electric-400">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-20">
          <div className="flex flex-col items-center gap-6 rounded-3xl bg-gradient-to-br from-electric-600 to-night-700 px-6 py-12 text-center sm:px-12">
            <DevicesIcon className="h-10 w-10 text-white/90" />
            <h2 className="text-2xl font-bold sm:text-3xl">Disponible sur le Web, bientôt sur mobile</h2>
            <p className="max-w-xl text-slate-100/90">
              Utilisez HAFIZ dès aujourd'hui depuis votre ordinateur ou votre téléphone. Les applications
              Android et iOS arrivent prochainement.
            </p>
            <Link to={ctaTo} className="rounded-xl bg-white px-6 py-3 font-semibold text-night-900 hover:bg-slate-100">
              Essayer HAFIZ
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} HAFIZ — {APP_TAGLINE}
      </footer>
    </div>
  );
}
