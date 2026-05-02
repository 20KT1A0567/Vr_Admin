import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

export function ForbiddenPage() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <section className="admin-shell max-w-2xl px-8 py-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-50 text-rose-700">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <div className="admin-pill mx-auto mt-5">403</div>
        <h1 className="admin-display mt-4 text-3xl font-semibold text-slate-950">Permission denied</h1>
        <p className="mt-3 text-slate-500">
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
