import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { ThemeToggleButton } from "components/layouts/ThemeToggleButton";

export function ForbiddenPage() {
  return (
    <div className="relative grid min-h-screen place-items-center bg-slate-50 dark:bg-[#0b1120] overflow-hidden">
      {/* Background Orbits */}
      <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-rose-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-24 right-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

      <div className="absolute right-8 top-8 z-10">
        <ThemeToggleButton />
      </div>

      <section className="relative z-10 w-full max-w-2xl px-8 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-rose-500/10 text-rose-600 shadow-2xl backdrop-blur-xl ring-1 ring-rose-500/20">
          <ShieldAlert className="h-10 w-10 animate-pulse" />
        </div>
        
        <div className="mt-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/5 px-4 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400">
            Protocol Error 403
          </div>
          <h1 className="mt-8 text-5xl font-black tracking-tight text-slate-900 dark:text-white">Access Revoked</h1>
          <p className="mx-auto mt-6 max-w-lg text-lg font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            Authentication established, but current credentials lack the necessary clearance levels for this operational module.
          </p>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <Link 
            to="/dashboard" 
            className="group flex items-center justify-center gap-3 rounded-2xl bg-slate-900 px-8 py-5 text-xs font-black uppercase tracking-[0.2em] text-white shadow-2xl transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            Return to Command
          </Link>
          <Link 
            to="/admin-users" 
            className="group flex items-center justify-center gap-3 rounded-2xl bg-white px-8 py-5 text-xs font-black uppercase tracking-[0.2em] text-slate-900 shadow-xl transition-all hover:bg-slate-50 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
          >
            Review Personnel Node
          </Link>
        </div>

        <div className="mt-16 flex items-center justify-center gap-8 border-t border-slate-200 pt-10 dark:border-white/5 opacity-50">
          <div className="flex flex-col items-center gap-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Identity Secure</div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Trace Active</div>
          </div>
        </div>
      </section>
    </div>
  );
}
