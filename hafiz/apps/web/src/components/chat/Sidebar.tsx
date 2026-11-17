import type { ConversationSummary } from "@hafiz/shared";
import { LIMITS } from "@hafiz/shared";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ChatIcon, LogoutIcon, PencilIcon, PlusIcon, TrashIcon, XIcon } from "../Icons";
import { Logo } from "../Logo";
import { Spinner } from "../Spinner";

interface SidebarProps {
  conversations: ConversationSummary[];
  activeId?: string;
  loading: boolean;
  error: string | null;
  userName: string;
  userEmail: string;
  open: boolean;
  onClose: () => void;
  onNew: () => void;
  onDelete: (c: ConversationSummary) => void;
  onRename: (id: string, title: string) => Promise<void>;
  onRetry: () => void;
  onSignOut: () => void;
}

function groupLabel(dateIso: string): string {
  const d = new Date(dateIso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 86_400_000;
  if (d.getTime() >= startOfToday) return "Aujourd'hui";
  if (d.getTime() >= startOfToday - day) return "Hier";
  if (d.getTime() >= startOfToday - 7 * day) return "7 derniers jours";
  if (d.getTime() >= startOfToday - 30 * day) return "30 derniers jours";
  return "Plus ancien";
}

export function Sidebar(props: SidebarProps) {
  const { conversations, activeId, loading, error, open, onClose } = props;

  const groups: { label: string; items: ConversationSummary[] }[] = [];
  for (const c of conversations) {
    const label = groupLabel(c.updatedAt);
    const g = groups.find((x) => x.label === label);
    if (g) g.items.push(c);
    else groups.push({ label, items: [c] });
  }

  return (
    <>
      {/* Fond sombre mobile */}
      <div
        className={`fixed inset-0 z-30 bg-night-950/60 backdrop-blur-sm transition-opacity md:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[290px] max-w-[85vw] flex-col bg-night-900 text-white transition-transform duration-200 md:static md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Conversations"
      >
        <div className="flex items-center justify-between px-4 pb-3 pt-4">
          <Logo size={32} to="/" />
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white md:hidden" aria-label="Fermer le menu">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="px-3">
          <button
            type="button"
            onClick={props.onNew}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-electric-500 px-3 py-2.5 text-sm font-semibold transition hover:bg-electric-600"
          >
            <PlusIcon className="h-4 w-4" /> Nouvelle conversation
          </button>
        </div>

        <nav className="mt-4 flex-1 overflow-y-auto px-2 pb-4">
          {loading && (
            <div className="flex justify-center py-6 text-electric-400"><Spinner /></div>
          )}
          {!loading && error && (
            <div className="mx-2 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">
              {error}
              <button type="button" onClick={props.onRetry} className="mt-2 block font-semibold underline">Réessayer</button>
            </div>
          )}
          {!loading && !error && conversations.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-slate-500">Aucune conversation pour l'instant.</p>
          )}
          {groups.map((g) => (
            <div key={g.label} className="mb-3">
              <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-slate-500">{g.label}</p>
              <ul className="space-y-0.5">
                {g.items.map((c) => (
                  <ConversationItem key={c.id} conversation={c} active={c.id === activeId}
                    onNavigate={onClose} onDelete={() => props.onDelete(c)} onRename={(t) => props.onRename(c.id, t)} />
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-3 border-t border-white/10 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-electric-500/20 text-sm font-semibold uppercase text-electric-300">
            {(props.userName || props.userEmail || "?").charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{props.userName || "Mon compte"}</p>
            <p className="truncate text-xs text-slate-400">{props.userEmail}</p>
          </div>
          <button type="button" onClick={props.onSignOut} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Se déconnecter" title="Se déconnecter">
            <LogoutIcon className="h-5 w-5" />
          </button>
        </div>
      </aside>
    </>
  );
}

function ConversationItem({ conversation, active, onNavigate, onDelete, onRename }: {
  conversation: ConversationSummary;
  active: boolean;
  onNavigate: () => void;
  onDelete: () => void;
  onRename: (title: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(conversation.title);
  const [saving, setSaving] = useState(false);

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const t = title.trim();
    if (!t || t === conversation.title) {
      setEditing(false);
      setTitle(conversation.title);
      return;
    }
    setSaving(true);
    try {
      await onRename(t);
      setEditing(false);
    } catch {
      setTitle(conversation.title);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <li>
        <form onSubmit={submit} className="px-1">
          <input
            autoFocus
            value={title}
            maxLength={LIMITS.TITLE_MAX_LENGTH}
            disabled={saving}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => submit()}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setTitle(conversation.title);
                setEditing(false);
              }
            }}
            aria-label="Nouveau titre"
            className="w-full rounded-lg border border-electric-500 bg-night-800 px-2.5 py-2 text-sm text-white outline-none"
          />
        </form>
      </li>
    );
  }

  return (
    <li className="group relative">
      <Link
        to={`/chat/${conversation.id}`}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-2.5 rounded-lg py-2 pl-3 pr-16 text-sm transition ${active ? "bg-night-700 text-white" : "text-slate-300 hover:bg-night-800 hover:text-white"}`}
      >
        <ChatIcon className="h-4 w-4 shrink-0 opacity-60" />
        <span className="truncate">{conversation.title}</span>
      </Link>
      <div className={`absolute inset-y-0 right-1 flex items-center gap-0.5 ${active ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"}`}>
        <button type="button" onClick={() => setEditing(true)} className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" aria-label={`Renommer « ${conversation.title} »`} title="Renommer">
          <PencilIcon className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={onDelete} className="rounded-md p-1.5 text-slate-400 hover:bg-red-500/20 hover:text-red-300" aria-label={`Supprimer « ${conversation.title} »`} title="Supprimer">
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}
