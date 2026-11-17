import type { ChatStreamEvent, ConversationSummary } from "@hafiz/shared";
import { APP_TAGLINE } from "@hafiz/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { AlertIcon, MenuIcon, PlusIcon, XIcon } from "../components/Icons";
import { Spinner } from "../components/Spinner";
import { ChatInput } from "../components/chat/ChatInput";
import { MessageBubble, type UIMessage } from "../components/chat/MessageBubble";
import { Sidebar } from "../components/chat/Sidebar";
import { useAuth } from "../contexts/AuthContext";
import { api, ApiError } from "../lib/api";

const SUGGESTIONS = [
  "Explique-moi un concept difficile simplement",
  "Aide-moi à rédiger un e-mail professionnel",
  "Propose-moi un planning de travail pour la semaine",
  "Donne-moi des idées de projets créatifs",
];

const STREAMING_ID = "__streaming__";

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [convLoading, setConvLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ConversationSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  /** Conversation créée localement : inutile de la recharger depuis l'API. */
  const skipLoadRef = useRef<string | null>(null);
  /** Message d'erreur à afficher après une redirection interne. */
  const pendingErrorRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const handleApiError = useCallback(
    async (err: unknown, fallback: string) => {
      if (err instanceof ApiError && err.status === 401) {
        await signOut();
        navigate("/connexion", { replace: true });
        return;
      }
      setError(err instanceof Error && err.message ? err.message : fallback);
    },
    [navigate, signOut],
  );

  // ---- Liste des conversations ----
  const loadConversations = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      setConversations(await api.listConversations());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return handleApiError(err, "");
      setListError(err instanceof Error ? err.message : "Impossible de charger l'historique.");
    } finally {
      setListLoading(false);
    }
  }, [handleApiError]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  // ---- Conversation active ----
  useEffect(() => {
    setError(pendingErrorRef.current);
    pendingErrorRef.current = null;
    if (skipLoadRef.current && skipLoadRef.current === conversationId) {
      skipLoadRef.current = null;
      return;
    }
    abortRef.current?.abort();
    if (!conversationId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setConvLoading(true);
    setMessages([]);
    api
      .getConversation(conversationId)
      .then((c) => {
        if (cancelled) return;
        stickToBottomRef.current = true;
        setMessages(c.messages);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
          pendingErrorRef.current = "Cette conversation n'existe pas ou a été supprimée.";
          navigate("/chat", { replace: true });
          return;
        }
        void handleApiError(err, "Impossible de charger la conversation.");
      })
      .finally(() => !cancelled && setConvLoading(false));
    return () => {
      cancelled = true;
    };
  }, [conversationId, navigate, handleApiError]);

  // Annule une génération en cours si l'on quitte la page.
  useEffect(() => () => abortRef.current?.abort(), []);

  // ---- Défilement automatique ----
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  // ---- Envoi d'un message ----
  async function handleSend(text: string) {
    setError(null);
    let id = conversationId;

    if (!id) {
      try {
        const created = await api.createConversation();
        setConversations((prev) => [created, ...prev]);
        skipLoadRef.current = created.id;
        id = created.id;
        setMessages([]);
        navigate(`/chat/${created.id}`);
      } catch (err) {
        return handleApiError(err, "Impossible de créer la conversation.");
      }
    }

    const tempUserId = `tmp-${Date.now()}`;
    stickToBottomRef.current = true;
    setMessages((prev) => [
      ...prev,
      { id: tempUserId, role: "user", content: text },
      { id: STREAMING_ID, role: "assistant", content: "", streaming: true },
    ]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let userSaved = false;

    const onEvent = (event: ChatStreamEvent) => {
      switch (event.type) {
        case "user_message":
          userSaved = true;
          setMessages((prev) => prev.map((m) => (m.id === tempUserId ? event.message : m)));
          break;
        case "conversation":
          setConversations((prev) => [event.conversation, ...prev.filter((c) => c.id !== event.conversation.id)]);
          break;
        case "delta":
          setMessages((prev) =>
            prev.map((m) => (m.id === STREAMING_ID ? { ...m, content: m.content + event.content } : m)),
          );
          break;
        case "assistant_message":
          setMessages((prev) => prev.map((m) => (m.id === STREAMING_ID ? event.message : m)));
          break;
        case "error":
          setError(event.error.message);
          break;
        case "done":
          break;
      }
    };

    try {
      await api.sendMessage(id, text, onEvent, controller.signal);
    } catch (err) {
      if (!userSaved) {
        // Le message n'a pas été enregistré : on le retire de l'affichage.
        setMessages((prev) => prev.filter((m) => m.id !== tempUserId));
      }
      await handleApiError(err, "Le message n'a pas pu être envoyé.");
    } finally {
      // Retire l'indicateur vide ou fige une réponse partielle (arrêt manuel).
      setMessages((prev) =>
        prev
          .filter((m) => !(m.id === STREAMING_ID && !m.content))
          .map((m) => (m.id === STREAMING_ID ? { ...m, id: `partial-${Date.now()}`, streaming: false } : m)),
      );
      if (abortRef.current === controller) abortRef.current = null;
      setStreaming(false);
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  function handleNew() {
    setSidebarOpen(false);
    navigate("/chat");
  }

  async function handleRename(id: string, title: string) {
    try {
      const updated = await api.renameConversation(id, title);
      setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      await handleApiError(err, "Impossible de renommer la conversation.");
      throw err;
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.deleteConversation(toDelete.id);
      setConversations((prev) => prev.filter((c) => c.id !== toDelete.id));
      if (toDelete.id === conversationId) navigate("/chat", { replace: true });
      setToDelete(null);
    } catch (err) {
      setToDelete(null);
      await handleApiError(err, "Impossible de supprimer la conversation.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSignOut() {
    abortRef.current?.abort();
    await signOut();
    navigate("/", { replace: true });
  }

  const activeTitle = conversations.find((c) => c.id === conversationId)?.title ?? "Nouvelle conversation";
  const displayName = (user?.user_metadata?.display_name as string | undefined) ?? "";
  const isEmpty = !convLoading && messages.length === 0;

  return (
    <div className="flex h-dvh overflow-hidden bg-white">
      <Sidebar
        conversations={conversations}
        activeId={conversationId}
        loading={listLoading}
        error={listError}
        userName={displayName}
        userEmail={user?.email ?? ""}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNew={handleNew}
        onDelete={setToDelete}
        onRename={handleRename}
        onRetry={loadConversations}
        onSignOut={handleSignOut}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-100 px-3 sm:px-5">
          <button type="button" onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-night-800 hover:bg-slate-100 md:hidden" aria-label="Ouvrir le menu">
            <MenuIcon className="h-5 w-5" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-night-900 sm:text-base">{activeTitle}</h1>
          <button type="button" onClick={handleNew} className="rounded-lg p-2 text-night-800 hover:bg-slate-100 md:hidden" aria-label="Nouvelle conversation">
            <PlusIcon className="h-5 w-5" />
          </button>
        </header>

        <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto">
          {convLoading ? (
            <div className="flex h-full items-center justify-center text-electric-500"><Spinner className="h-7 w-7" /></div>
          ) : isEmpty ? (
            <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-4 py-10 text-center">
              <img src="/logo.svg" alt="" className="h-16 w-16 rounded-2xl shadow-lg shadow-electric-500/20" />
              <h2 className="mt-5 text-2xl font-bold text-night-900 sm:text-3xl">
                {displayName ? `Bonjour ${displayName.split(" ")[0]} !` : "Bonjour !"}
              </h2>
              <p className="mt-2 text-slate-500">{APP_TAGLINE}. Comment puis-je vous aider aujourd'hui ?</p>
              <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" disabled={streaming} onClick={() => handleSend(s)}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm text-night-800 transition hover:border-electric-300 hover:bg-electric-500/5">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
              {messages.map((m) => <MessageBubble key={m.id} message={m} />)}
            </div>
          )}
        </div>

        <div className="shrink-0 bg-gradient-to-t from-white via-white to-white/0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-6">
          {error && (
            <div role="alert" className="mx-auto mb-3 flex max-w-3xl items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1">{error}</span>
              <button type="button" onClick={() => setError(null)} aria-label="Fermer" className="rounded p-0.5 hover:bg-red-100">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          )}
          <ChatInput streaming={streaming} disabled={convLoading} onSend={handleSend} onStop={handleStop} autoFocusKey={conversationId} />
        </div>
      </main>

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer la conversation ?"
        message={`« ${toDelete?.title ?? ""} » et tous ses messages seront définitivement supprimés.`}
        confirmLabel="Supprimer"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
