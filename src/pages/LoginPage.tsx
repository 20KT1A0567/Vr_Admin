import { FormEvent, useState } from "react";
import { ShieldCheck, Store, Truck, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authApi } from "api/client";
import { useAuthStore } from "store/authStore";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const setUser = useAuthStore((state) => state.setUser);
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const user = await authApi.login({ email, password });
      setUser(user);
      toast.success("Admin access granted");
      navigate("/dashboard");
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
          ? (error as { response: { data: { message: string } } }).response.data.message
          : "Login failed. Please verify the backend is running and the admin user exists.";
      toast.error(message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="grid w-full max-w-6xl gap-4 lg:grid-cols-[420px_1fr]">
        <form className="admin-shell space-y-5 p-8 lg:p-10" onSubmit={handleSubmit}>
          <div className="admin-pill">Private Admin Access</div>
          <h1 className="admin-display text-4xl font-semibold text-slate-950">Sign in to the VR Technologies admin panel.</h1>
          <p className="text-slate-500">Use your admin credentials to manage products, stores, banners, orders, and customer operations.</p>

          <div className="space-y-4">
            <input className="admin-input" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <input className="admin-input" type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>

          <button className="admin-button w-full">Login</button>

          <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            Admin access protects live catalog data, order flow, and homepage campaigns.
          </div>
        </form>

        <section className="admin-shell relative overflow-hidden p-8 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.14),transparent_34%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#0f172a,#1e293b)] text-lg font-bold text-white">VR</div>
                <div>
                  <div className="admin-display text-2xl font-bold text-slate-950">VR Technologies</div>
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Admin Panel</div>
                </div>
              </div>

              <h2 className="admin-display mt-10 max-w-2xl text-4xl font-semibold text-slate-950">A lighter control room for the whole storefront operation.</h2>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-500">
                Products, stores, orders, customers, and homepage campaigns now live inside one calmer admin experience inspired by your reference layout.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                { icon: ShieldCheck, title: "Secure admin access", body: "Protected routes and token-based API requests for live operations." },
                { icon: Store, title: "Store management", body: "Maintain branch cards, pickup coverage, and active location details." },
                { icon: Truck, title: "Order operations", body: "Track fulfilment states, payment status, and delivery readiness." },
                { icon: Wallet, title: "Campaign control", body: "Manage hero banners, categories, brands, and coupon UI flows." }
              ].map((item) => (
                <article key={item.title} className="admin-shell-muted p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-white p-3 text-slate-700 shadow-sm">
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
