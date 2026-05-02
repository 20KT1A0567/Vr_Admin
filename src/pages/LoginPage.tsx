import { FormEvent, useState } from "react";
import { ArrowRight, ShieldCheck, Store, Truck, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authApi, getApiErrorMessage } from "api/client";
import { getDefaultAdminRoute } from "utils/adminAccess";
import { useAuthStore } from "store/authStore";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const user = await authApi.login({ email, password });
      setUser(user);
      toast.success("Admin access granted");
      navigate(getDefaultAdminRoute(user), { replace: true });
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Login failed. Please verify the backend is running and the admin user exists."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(30,58,138,0.14),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(22,163,74,0.1),transparent_30%),linear-gradient(180deg,#fdfefe_0%,#f8fafc_100%)]" />
      <div className="relative grid w-full max-w-7xl gap-5 lg:grid-cols-[430px_1fr]">
        <form className="admin-shell relative overflow-hidden p-8 sm:p-10" onSubmit={handleSubmit}>
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#16a34a,#2563eb)]" />
          <div className="admin-pill">Private Admin Access</div>
          <h1 className="mt-5 text-[2rem] font-bold leading-tight tracking-[-0.04em] text-slate-950">Sign in to the VR Technologies admin panel.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Manage products, stores, banners, orders, and customer operations from one premium SaaS workspace.
          </p>

          <div className="mt-8 space-y-4">
            <label className="block">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Email</div>
              <input className="admin-input" placeholder="admin@vrtechnologies.in" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="block">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Password</div>
              <input className="admin-input" placeholder="Enter password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
          </div>

          <button className="admin-button mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold" disabled={loading}>
            {loading ? "Signing in..." : "Enter workspace"}
            <ArrowRight className="h-4 w-4" />
          </button>

          <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
            Admin access protects live catalog data, storefront content, customer records, and active order flow.
          </div>
        </form>

        <section className="admin-shell relative overflow-hidden p-8 sm:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(22,163,74,0.1),transparent_32%)]" />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white/80 px-4 py-2 shadow-sm backdrop-blur">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#1e3a8a,#172554)] text-sm font-bold text-white">VR</div>
                <div>
                  <div className="text-sm font-semibold text-slate-950">VR Technologies</div>
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Operations Console</div>
                </div>
              </div>

              <h2 className="mt-10 max-w-3xl text-[2.35rem] font-bold leading-tight tracking-[-0.045em] text-slate-950">
                A premium control room for catalog, storefront, and order operations.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-500">
                Built for fast day-to-day execution with stronger hierarchy, cleaner whitespace, and calmer operational visibility.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                { icon: ShieldCheck, title: "Secure admin access", body: "Protected routes and token-based API requests keep live operations controlled." },
                { icon: Store, title: "Store management", body: "Maintain branch cards, timings, contact details, and website visibility." },
                { icon: Truck, title: "Order operations", body: "Track fulfilment states, payment status, and delivery readiness in one desk." },
                { icon: Wallet, title: "Campaign control", body: "Manage banners, coupons, categories, and brand presentation without backend rewrites." }
              ].map((item) => (
                <article key={item.title} className="rounded-[24px] border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{item.title}</div>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{item.body}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
