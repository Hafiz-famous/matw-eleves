import { APP_TAGLINE } from "@hafiz/shared";
import type { ReactNode } from "react";
import { Logo } from "./Logo";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden bg-night-950 px-4 py-10">
      <div
        className="pointer-events-none absolute left-1/2 top-[-200px] h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-electric-500/20 blur-[120px]"
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <Logo size={44} />
          <p className="text-sm text-slate-400">{APP_TAGLINE}</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-2xl shadow-black/40 sm:p-8">
          <h1 className="text-2xl font-bold text-night-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-night-900 placeholder:text-slate-400 outline-none transition focus:border-electric-500 focus:ring-4 focus:ring-electric-500/15";

export const primaryButtonClass =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-electric-500 px-4 py-2.5 font-semibold text-white transition hover:bg-electric-600 disabled:cursor-not-allowed disabled:opacity-60";
