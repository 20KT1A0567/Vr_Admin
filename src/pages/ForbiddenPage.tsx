import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { ThemeToggleButton } from "components/layouts/ThemeToggleButton";

export function ForbiddenPage() {
  return (
    <div className="relative grid min-h-[60vh] place-items-center">
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <ThemeToggleButton />
      </div>
      <section className="admin-empty-state max-w-2xl px-8 py-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-50 text-rose-700 shadow-sm">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <div className="admin-pill mx-auto mt-5">403</div>
        <h1 className="admin-display mt-4 text-3xl font-black text-[color:var(--color-text)]">Permission denied</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[color:var(--color-text-subtle)]">
          Your account is authenticated, but it does not currently have access to this module or action.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/dashboard" className="admin-button">
            Go to dashboard
          </Link>
          <Link to="/admin-users" className="admin-button-secondary">
            Review admin access
          </Link>
        </div>
      </section>
    </div>
  );
}
