import { LIMITS } from "@hafiz/shared";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { SendIcon, StopIcon } from "../Icons";

interface ChatInputProps {
  streaming: boolean;
  disabled?: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  autoFocusKey?: string;
}

export function ChatInput({ streaming, disabled, onSend, onStop, autoFocusKey }: ChatInputProps) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Pas d'autofocus sur mobile pour ne pas ouvrir le clavier inutilement.
    if (window.matchMedia("(min-width: 768px)").matches) ref.current?.focus();
  }, [autoFocusKey]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const tooLong = value.length > LIMITS.MESSAGE_MAX_LENGTH;
  const canSend = !streaming && !disabled && value.trim().length > 0 && !tooLong;

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!canSend) return;
    onSend(value.trim());
    setValue("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-3xl">
      <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-night-900/5 transition focus-within:border-electric-500 focus-within:ring-4 focus-within:ring-electric-500/10">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Écrivez votre message à HAFIZ…"
          aria-label="Votre message"
          className="max-h-[200px] min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] text-night-900 outline-none placeholder:text-slate-400"
        />
        {streaming ? (
          <button type="button" onClick={onStop} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-night-900 text-white transition hover:bg-night-700" aria-label="Arrêter la génération" title="Arrêter">
            <StopIcon className="h-4 w-4" />
          </button>
        ) : (
          <button type="submit" disabled={!canSend} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-electric-500 text-white transition hover:bg-electric-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400" aria-label="Envoyer" title="Envoyer (Entrée)">
            <SendIcon className="h-5 w-5" />
          </button>
        )}
      </div>
      <div className="mt-2 flex justify-between px-1 text-xs text-slate-400">
        <span className="hidden sm:inline">Entrée pour envoyer · Maj + Entrée pour un saut de ligne</span>
        <span className={tooLong ? "font-semibold text-red-600" : value.length > LIMITS.MESSAGE_MAX_LENGTH * 0.8 ? "" : "invisible"}>
          {value.length} / {LIMITS.MESSAGE_MAX_LENGTH}
        </span>
      </div>
    </form>
  );
}
