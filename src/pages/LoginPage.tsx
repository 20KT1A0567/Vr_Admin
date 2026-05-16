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
import toast from "react-hot-toast";
import { authApi, getApiErrorMessage } from "api/client";
import vrTechnologiesLogo from "../assets/vr-technologies-logo.svg";
import { ThemeToggleButton } from "components/layouts/ThemeToggleButton";
import { getDefaultAdminRoute } from "utils/adminAccess";
import { useAuthStore } from "store/authStore";
import { isTwoFactorChallenge, type TwoFactorChallenge } from "types";

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

    try {
      const result = await authApi.login({ email, password });
      if (isTwoFactorChallenge(result)) {
        setStage({ kind: "twoFactor", challenge: result });
        toast.success(`We sent a verification code to ${result.maskedEmail}`);
      } else {
        setUser(result);
        toast.success("Admin access granted");
        navigate(getDefaultAdminRoute(result), { replace: true });
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Login failed. Please verify the backend is running and the admin user exists."));
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
      toast.error(getApiErrorMessage(error, "Could not verify the code."));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (stage.kind !== "twoFactor") return;
    try {
      const refreshed = await authApi.resendTwoFactor(stage.challenge.challengeId);
      setStage({ kind: "twoFactor", challenge: refreshed });
      toast.success("A new verification code is on its way");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Could not resend the code."));
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
      toast.error(getApiErrorMessage(error, "Could not redeem backup code."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login-root relative grid min-h-screen overflow-hidden lg:grid-cols-[minmax(0,1fr)_500px]">
      <div className="admin-login-orbit admin-login-orbit-one" />
      <div className="admin-login-orbit admin-login-orbit-two" />

      <div className="pointer-events-none absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <div className="pointer-events-auto">
          <ThemeToggleButton />
        </div>
      </div>

      <ShowcaseSection />

      <section className="relative z-[1] flex flex-col items-center justify-center px-4 py-8 sm:px-6">
        {stage.kind === "credentials" ? (
          <form className="admin-login-card admin-login-panel w-full max-w-[450px] p-6 sm:p-8" onSubmit={handleCredentialsSubmit}>
            <div className="flex items-center gap-3">
              <div className="admin-login-logo-shell flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--admin-surface-muted)] lg:hidden">
                <img src={vrTechnologiesLogo} alt="VR Technologies logo" className="h-9 w-9 object-contain" />
              </div>
              <div>
                <div className="admin-pill inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Secure access
                </div>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[color:var(--color-text)]">Welcome back</h2>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-[color:var(--color-text-subtle)]">
              Sign in to manage catalog, orders, stores, roles, and storefront content from one protected console.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--admin-surface-muted)] p-1">
              <div className="admin-login-step" data-active="true">
                <UserRound className="h-4 w-4" />
                Credentials
              </div>
              <div className="admin-login-step">
                <KeyRound className="h-4 w-4" />
                Email OTP
              </div>
            </div>

            <div className="mt-7 space-y-4">
              <label className="block">
                <div className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[color:var(--color-text-subtle)]">Email address</div>
                <input
                  className="admin-input"
                  placeholder="admin@vrtechnologies.in"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>

              <label className="block">
                <div className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[color:var(--color-text-subtle)]">Password</div>
                <div className="relative">
                  <input
                    className="admin-input pr-12"
                    placeholder="Enter password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[color:var(--color-text-subtle)] transition hover:bg-[color:var(--admin-surface-muted)] hover:text-[color:var(--color-text)]"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            </div>

            <button className="admin-button mt-6 w-full" disabled={loading || !email || !password}>
              {loading ? "Signing in..." : "Continue"}
              <ArrowRight className="h-4 w-4" />
            </button>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="admin-login-mini-card">
                <LockKeyhole className="h-4 w-4 text-[color:var(--color-accent)]" />
                <span>Role permissions</span>
              </div>
              <div className="admin-login-mini-card">
                <MailCheck className="h-4 w-4 text-emerald-500" />
                <span>Email OTP ready</span>
              </div>
            </div>

            <p className="mt-8 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-text-subtle)]">
              VR Technologies - Enterprise commerce admin
            </p>
          </form>
        ) : (
          <TwoFactorCard
            challenge={stage.challenge}
            loading={loading}
            onVerify={handleVerify}
            onResend={handleResend}
            onBackupCode={handleBackupCode}
            onBack={() => setStage({ kind: "credentials" })}
          />
        )}
      </section>
    </main>
  );
}

function ShowcaseSection() {
  return (
    <section className="admin-login-showcase relative hidden overflow-hidden px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div>
        <div className="inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.08] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.25)] backdrop-blur-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-lg">
            <img src={vrTechnologiesLogo} alt="VR Technologies logo" className="h-10 w-10 object-contain" />
          </div>
          <div>
            <div className="text-base font-extrabold tracking-tight">VR Technologies</div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-200/90">Enterprise commerce admin</div>
          </div>
        </div>

        <div className="mt-16 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/35 bg-indigo-500/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-indigo-100">
            <Sparkles className="h-3.5 w-3.5" />
            Built to sell and scale
          </div>
          <h1 className="mt-6 text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl">
            A sharper admin console for serious daily operations.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-indigo-100/85">
            Products, inventory, orders, stores, permissions, and content stay in one fast workspace protected by two-step verification.
          </p>
        </div>
      </div>

      <div className="admin-login-command-center">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-200">Live control room</div>
            <div className="mt-1 text-sm text-indigo-100/70">Today at a glance</div>
          </div>
          <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-200">Online</div>
        </div>
        <div className="grid grid-cols-3 gap-3 p-5">
          {[
            ["Orders", "128"],
            ["Revenue", "2.8L"],
            ["Stores", "4"]
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-200/75">{label}</div>
              <div className="mt-2 text-2xl font-black text-white">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid max-w-4xl gap-4 md:grid-cols-2">
        {[
          { icon: Boxes, title: "Catalog & inventory", body: "Products, categories, brands, and stock arranged for clear action." },
          { icon: ChartNoAxesCombined, title: "Executive dashboard", body: "Revenue, orders, and health metrics at a glance." },
          { icon: MapPinned, title: "Store network", body: "Branches, coverage, and local visibility in one place." },
          { icon: ShieldCheck, title: "Governance & 2FA", body: "Roles, schedules, audit logs, and email OTP for super admins." }
        ].map((item) => (
          <article
            key={item.title}
            className="rounded-2xl border border-white/12 bg-white/[0.06] p-5 shadow-[0_20px_48px_rgba(0,0,0,0.22)] backdrop-blur-md transition hover:border-white/18 hover:bg-white/[0.09]"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-gradient-to-br from-indigo-500/40 to-teal-500/25 p-3 text-white ring-1 ring-white/10">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold text-white">{item.title}</div>
                <p className="mt-1 text-sm leading-6 text-indigo-100/75">{item.body}</p>
              </div>
            </div>
          </article>
        ))}
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
    if (value && idx < OTP_LENGTH - 1) {
      inputs.current[idx + 1]?.focus();
    }
    if (next.every((d) => d.length === 1)) {
      onVerify(next.join(""));
    }
  }

  function onKeyDown(idx: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
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
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    inputs.current[focusIdx]?.focus();
    if (pasted.length === OTP_LENGTH) onVerify(pasted);
  }

  function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "backup") {
      const trimmed = backupValue.trim();
      if (trimmed.length >= 6) onBackupCode(trimmed);
      return;
    }
    if (code.length === OTP_LENGTH) onVerify(code);
  }

  const expired = secondsLeft <= 0;

  return (
    <form className="admin-login-card admin-login-panel w-full max-w-[470px] p-6 sm:p-8" onSubmit={handleManualSubmit}>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-text)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Use a different account
      </button>

      <div className="flex items-start gap-3">
        <div className="admin-login-logo-shell flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--admin-surface-muted)]">
          <MailCheck className="h-6 w-6 text-[color:var(--color-accent)]" />
        </div>
        <div className="flex-1">
          <div className="admin-pill">Two-step verification</div>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[color:var(--color-text)]">Enter your code</h2>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-[color:var(--color-text-subtle)]">
        We sent a {OTP_LENGTH}-digit code to <span className="font-semibold text-[color:var(--color-text)]">{challenge.maskedEmail}</span>.
        It expires in <span className="font-semibold text-[color:var(--color-text)]">{formatDuration(secondsLeft)}</span>.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--admin-surface-muted)] p-1">
        <div className="admin-login-step">
          <UserRound className="h-4 w-4" />
          Credentials
        </div>
        <div className="admin-login-step" data-active="true">
          <KeyRound className="h-4 w-4" />
          Email OTP
        </div>
      </div>

      {mode === "otp" ? (
        <>
          <div className="mt-6 flex justify-between gap-2 sm:gap-3">
            {Array.from({ length: OTP_LENGTH }).map((_, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputs.current[idx] = el;
                }}
                value={digits[idx]}
                onChange={(event) => setDigit(idx, event.target.value)}
                onKeyDown={(event) => onKeyDown(idx, event)}
                onPaste={onPaste}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                disabled={expired || loading}
                className="admin-otp-cell"
                aria-label={`Digit ${idx + 1}`}
              />
            ))}
          </div>

          <button
            type="submit"
            className="admin-button mt-6 w-full"
            disabled={loading || code.length !== OTP_LENGTH || expired}
          >
            {loading ? "Verifying..." : "Verify and sign in"}
            <ArrowRight className="h-4 w-4" />
          </button>

          <div className="mt-5 flex items-center justify-between gap-3 text-xs font-semibold text-[color:var(--color-text-subtle)]">
            <span>Did not receive it? Check spam first.</span>
            <button
              type="button"
              onClick={onResend}
              disabled={resendIn > 0}
              className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-border)] bg-[color:var(--admin-surface-muted)] px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] hover:text-[color:var(--color-text)] disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
            </button>
          </div>

          {expired ? (
            <div className="mt-5 rounded-2xl border border-amber-300/40 bg-amber-500/10 p-3 text-xs leading-5 text-amber-700 dark:text-amber-200">
              Your code expired. Use the resend button to receive a new one.
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setMode("backup")}
            className="mt-5 inline-flex w-full items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-accent)]"
          >
            <KeyRound className="h-3.5 w-3.5" /> Use a backup code instead
          </button>
        </>
      ) : (
        <>
          <label className="mt-6 block">
            <div className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[color:var(--color-text-subtle)]">Backup code</div>
            <input
              className="admin-input font-mono tracking-[0.2em]"
              placeholder="XXXX-XXXX"
              value={backupValue}
              onChange={(event) => setBackupValue(event.target.value.toUpperCase())}
              autoComplete="one-time-code"
              autoFocus
              spellCheck={false}
              maxLength={32}
            />
            <p className="mt-2 text-xs text-[color:var(--color-text-subtle)]">
              Use one of the 10 codes you saved on the Security page. Each code works only once.
            </p>
          </label>

          <button
            type="submit"
            className="admin-button mt-5 w-full"
            disabled={loading || backupValue.replace(/[^A-Za-z0-9]/g, "").length < 6}
          >
            {loading ? "Verifying..." : "Sign in with backup code"}
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setMode("otp")}
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-accent)]"
          >
            <MailCheck className="h-3.5 w-3.5" /> Use the email OTP instead
          </button>
        </>
      )}
    </form>
  );
}

function formatDuration(seconds: number) {
  if (seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
