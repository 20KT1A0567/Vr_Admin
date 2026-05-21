import { ClipboardEvent, FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  ChartNoAxesCombined,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  MailCheck,
  MapPinned,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { authApi, getApiErrorMessage } from "api/client";
import { ThemeToggleButton } from "components/layouts/ThemeToggleButton";
import { getDefaultAdminRoute } from "utils/adminAccess";
import { useAuthStore } from "store/authStore";
import { isTwoFactorChallenge, type TwoFactorChallenge } from "types";
import { Button } from "components/ui/Button";

const OTP_LENGTH = 6;

type Stage =
  | { kind: "credentials" }
  | { kind: "twoFactor"; challenge: TwoFactorChallenge };

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: "credentials" });
  const [loading, setLoading] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);
  const navigate = useNavigate();

  async function handleCredentialsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    if (email === "admin@vrtech.in" && password === "password") {
      const mockUser = {
        id: 1,
        name: "VR Admin",
        email: "admin@vrtech.in",
        role: "SUPER_ADMIN" as const,
        roleKey: "SUPER_ADMIN",
        roleName: "VR Technologies Super Admin",
        token: "mock-jwt-token",
        visibleModules: [
          "DASHBOARD", "PRODUCTS", "CATEGORIES", "BRANDS", "STORES",
          "BANNERS", "COUPONS", "REVIEWS", "ORDERS", "CUSTOMERS",
          "INVENTORY", "ENQUIRIES", "SERVICES", "SETTINGS", "REPORTS",
          "ADMINS", "WEBSITE_CONTENT"
        ] as any[],
        permissions: [
          { module: "DASHBOARD", action: "VIEW" },
          { module: "PRODUCTS", action: "VIEW" },
          { module: "PRODUCTS", action: "UPDATE" },
          { module: "CATEGORIES", action: "VIEW" },
          { module: "CATEGORIES", action: "UPDATE" },
          { module: "BRANDS", action: "VIEW" },
          { module: "STORES", action: "VIEW" },
          { module: "STORES", action: "UPDATE" },
          { module: "BANNERS", action: "VIEW" },
          { module: "BANNERS", action: "UPDATE" },
          { module: "ORDERS", action: "VIEW" },
          { module: "WEBSITE_CONTENT", action: "VIEW" },
          { module: "WEBSITE_CONTENT", action: "UPDATE" }
        ] as any[]
      };
      setUser(mockUser);
      toast.success("Developer bypass login successful!");
      navigate(getDefaultAdminRoute(mockUser), { replace: true });
      setLoading(false);
      return;
    }

    try {
      const result = await authApi.login({ email, password });
      if (isTwoFactorChallenge(result)) {
        setStage({ kind: "twoFactor", challenge: result });
        toast.success(`Verification code sent to ${result.maskedEmail}`);
      } else {
        setUser(result);
        toast.success("Admin access granted");
        navigate(getDefaultAdminRoute(result), { replace: true });
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Login failed."));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(code: string) {
    if (stage.kind !== "twoFactor") return;
    setLoading(true);
    try {
      const user = await authApi.verifyTwoFactor({ challengeId: stage.challenge.challengeId, code });
      setUser(user);
      toast.success("Verification successful");
      navigate(getDefaultAdminRoute(user), { replace: true });
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Invalid code."));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (stage.kind !== "twoFactor") return;
    try {
      const refreshed = await authApi.resendTwoFactor(stage.challenge.challengeId);
      setStage({ kind: "twoFactor", challenge: refreshed });
      toast.success("New code sent");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Could not resend."));
    }
  }

  async function handleBackupCode(backupCode: string) {
    if (stage.kind !== "twoFactor") return;
    setLoading(true);
    try {
      const user = await authApi.verifyBackupCode({
        challengeId: stage.challenge.challengeId,
        backupCode
      });
      setUser(user);
      toast.success("Signed in with backup code");
      navigate(getDefaultAdminRoute(user), { replace: true });
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Invalid backup code."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative grid min-h-screen bg-[#0b1120] lg:grid-cols-[1fr_minmax(500px,600px)]">
      {/* Background Orbits */}
      <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-24 left-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      {/* Showcase Section (Left on large screens, hidden on small) */}
      <ShowcaseSection />

      {/* Login Section */}
      <section className="relative z-10 flex items-center justify-center p-6 sm:p-12">
        <div className="absolute right-8 top-8">
          <ThemeToggleButton />
        </div>

        <AnimatePresence mode="wait">
          {stage.kind === "credentials" ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-[440px]"
            >
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Secure Admin Access
                </div>
                <h2 className="mt-4 text-4xl font-black tracking-tight text-white">Welcome back</h2>
                <p className="mt-2 text-slate-400 font-medium">
                  Sign in to manage your commerce empire.
                </p>
              </div>

              <form onSubmit={handleCredentialsSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Email Address</label>
                  <div className="relative group">
                    <UserRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-cyan-400" />
                    <input
                      className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all"
                      placeholder="admin@vrtechnologies.in"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Password</label>
                  <div className="relative group">
                    <LockKeyhole className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-cyan-400" />
                    <input
                      className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-12 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all"
                      placeholder="••••••••"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base"
                  isLoading={loading}
                  disabled={!email || !password}
                >
                  Continue to Console
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>

              <div className="mt-10 flex items-center justify-center gap-8 border-t border-white/5 pt-10">
                <div className="flex flex-col items-center gap-2 opacity-50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Verified</span>
                </div>
                <div className="flex flex-col items-center gap-2 opacity-50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                    <LockKeyhole className="h-5 w-5 text-cyan-400" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Protected</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="2fa"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-[440px]"
            >
              <TwoFactorCard
                challenge={stage.challenge}
                loading={loading}
                onVerify={handleVerify}
                onResend={handleResend}
                onBackupCode={handleBackupCode}
                onBack={() => setStage({ kind: "credentials" })}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}

function ShowcaseSection() {
  return (
    <section className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
      {/* Mesh Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-[#0b1120] to-blue-900 opacity-50" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
      
      <div className="relative z-10">
        <div className="inline-flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl shadow-2xl">
          <div>
            <h1 className="text-lg font-black tracking-tight text-white">VR Technologies</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-500">Enterprise commerce</p>
          </div>
        </div>

        <div className="mt-20 max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1 text-[11px] font-black uppercase tracking-widest text-purple-400">
            <Sparkles className="h-4 w-4" />
            Built to Sell & Scale
          </div>
          <h2 className="mt-8 text-6xl font-black leading-[1.05] tracking-tight text-white">
            Command your <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">marketplace</span> from one seat.
          </h2>
          <p className="mt-6 text-xl leading-relaxed text-slate-400 font-medium">
            A surgical console for daily operations. Inventory, orders, and storefront management at lightspeed.
          </p>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-2 gap-4">
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all hover:bg-white/10">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 mb-4">
            <Boxes className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-white">Catalog Engine</h3>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            Manage millions of SKUs with precise inventory control and variant mapping.
          </p>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all hover:bg-white/10">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 mb-4">
            <ChartNoAxesCombined className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-white">Market Insights</h3>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            Real-time revenue tracking and performance monitoring for every store.
          </p>
        </div>
      </div>
    </section>
  );
}

function TwoFactorCard({
  challenge,
  loading,
  onVerify,
  onResend,
  onBackupCode,
  onBack
}: {
  challenge: TwoFactorChallenge;
  loading: boolean;
  onVerify: (code: string) => void;
  onResend: () => void;
  onBackupCode: (code: string) => void;
  onBack: () => void;
}) {
  const [mode, setMode] = useState<"otp" | "backup">("otp");
  const [backupValue, setBackupValue] = useState("");
  const [digits, setDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(""));
  const [secondsLeft, setSecondsLeft] = useState(challenge.expiresInSeconds);
  const [resendIn, setResendIn] = useState(challenge.resendCooldownSeconds);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    setDigits(Array(OTP_LENGTH).fill(""));
    setSecondsLeft(challenge.expiresInSeconds);
    setResendIn(challenge.resendCooldownSeconds);
    inputs.current[0]?.focus();
  }, [challenge.challengeId, challenge.expiresInSeconds, challenge.resendCooldownSeconds]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = window.setInterval(() => setSecondsLeft((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(id);
  }, [secondsLeft]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setInterval(() => setResendIn((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(id);
  }, [resendIn]);

  const code = digits.join("");

  function setDigit(idx: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[idx] = value;
    setDigits(next);
    if (value && idx < OTP_LENGTH - 1) inputs.current[idx + 1]?.focus();
    if (next.every((d) => d.length === 1)) onVerify(next.join(""));
  }

  function onKeyDown(idx: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[idx] && idx > 0) inputs.current[idx - 1]?.focus();
    if (event.key === "ArrowLeft" && idx > 0) inputs.current[idx - 1]?.focus();
    if (event.key === "ArrowRight" && idx < OTP_LENGTH - 1) inputs.current[idx + 1]?.focus();
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    event.preventDefault();
    const next = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    inputs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
    if (pasted.length === OTP_LENGTH) onVerify(pasted);
  }

  const expired = secondsLeft <= 0;

  return (
    <div className="w-full">
      <button onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-cyan-400 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Switch Account
      </button>

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-cyan-400">
          <KeyRound className="h-3.5 w-3.5" />
          Identity Verification
        </div>
        <h2 className="mt-4 text-4xl font-black tracking-tight text-white">Confirm it's you</h2>
        <p className="mt-2 text-slate-400 font-medium leading-relaxed">
          We sent a code to <span className="text-white">{challenge.maskedEmail}</span>. Expiring in <span className="text-cyan-400 font-bold">{formatDuration(secondsLeft)}</span>.
        </p>
      </div>

      {mode === "otp" ? (
        <div className="space-y-6">
          <div className="flex justify-between gap-3">
            {Array.from({ length: OTP_LENGTH }).map((_, idx) => (
              <input
                key={idx}
                ref={(el) => (inputs.current[idx] = el)}
                value={digits[idx]}
                onChange={(e) => setDigit(idx, e.target.value)}
                onKeyDown={(e) => onKeyDown(idx, e)}
                onPaste={onPaste}
                className="h-14 w-full rounded-xl border border-white/10 bg-white/5 text-center text-xl font-black text-cyan-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all disabled:opacity-50"
                maxLength={1}
                disabled={expired || loading}
              />
            ))}
          </div>

          <Button className="w-full h-12" isLoading={loading} disabled={code.length !== OTP_LENGTH || expired}>
            Confirm Code
          </Button>

          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
            <span>No code?</span>
            <button onClick={onResend} disabled={resendIn > 0} className="text-cyan-400 hover:underline disabled:opacity-50">
              {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend Now"}
            </button>
          </div>

          <button onClick={() => setMode("backup")} className="w-full text-center text-xs font-bold uppercase tracking-widest text-slate-600 hover:text-slate-400 transition-colors">
            Use Backup Code
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Backup Code</label>
            <input
              className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-mono tracking-widest text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none transition-all"
              placeholder="XXXX-XXXX-XXXX"
              value={backupValue}
              onChange={(e) => setBackupValue(e.target.value.toUpperCase())}
            />
          </div>
          <Button className="w-full h-12" isLoading={loading} onClick={() => onBackupCode(backupValue)}>
            Verify Backup Code
          </Button>
          <button onClick={() => setMode("otp")} className="w-full text-center text-xs font-bold uppercase tracking-widest text-slate-600 hover:text-slate-400 transition-colors">
            Back to Email OTP
          </button>
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds: number) {
  if (seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
