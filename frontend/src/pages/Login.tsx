import { FormEvent, useState } from 'react';
import {
  ArrowRight,
  LockKeyhole,
  Mail,
  TestTubeDiagonal,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../app/AuthContext';

const LOGIN_TIMEOUT_MS = 15000;

export function Login() {
  const navigate = useNavigate();
  const { login, landingPath } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email address and password.');
      return;
    }

    setLoading(true);

    let timeoutId: number | undefined;

    const timeout = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(() => {
        reject(
          new Error(
            'Sign in is taking too long. Please check your connection and try again.',
          ),
        );
      }, LOGIN_TIMEOUT_MS);
    });

    try {
      await Promise.race([login(email.trim(), password), timeout]);
      navigate(landingPath, { replace: true });
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Unable to sign in. Please try again.',
      );
    } finally {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }

      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#f4f7fb] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <div className="w-full max-w-[900px]">
        <section className="grid w-full overflow-hidden border border-[#d8e2ec] bg-white shadow-[0_16px_38px_rgba(15,35,60,0.10)] lg:grid-cols-2">

          {/* LEFT BRANDING PANEL */}
          <div className="relative flex min-h-[360px] flex-col justify-between overflow-hidden bg-[#0b2945] px-6 py-7 text-white sm:min-h-[420px] sm:px-9 sm:py-8 lg:min-h-[530px] lg:px-10">

            {/* Square background patterns */}
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 border border-white/[0.08]" />
            <div className="pointer-events-none absolute -bottom-28 -left-24 h-64 w-64 border border-white/[0.08]" />
            <div className="pointer-events-none absolute right-5 top-1/2 h-32 w-32 border border-white/[0.05]" />

            {/* LOGO */}
            <div className="relative z-10 flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center bg-[#08a6c8]">
                <TestTubeDiagonal
                  size={22}
                  strokeWidth={1.8}
                  className="text-white"
                />
              </div>

              <div>
                <h1 className="text-[18px] font-bold leading-none tracking-[0.02em]">
                  LabFlow
                </h1>

                <p className="mt-1 text-[8px] font-medium uppercase tracking-[0.22em] text-[#6da8c0]">
                  Diagnostics
                </p>
              </div>
            </div>

            {/* BRANDING CONTENT */}
            <div className="relative z-10 mt-12 lg:mt-14">
              <div className="mb-4 h-[2px] w-11 bg-[#2ca6c9]" />

              <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#76c8dc] sm:text-[10px]">
                Smart Laboratory Platform
              </p>

              <h2 className="max-w-[350px] text-[28px] font-bold leading-[1.18] tracking-[-0.7px] sm:text-[34px] lg:text-[36px]">
                Smarter diagnostics.
                <br />
                Better care.
              </h2>

              <p className="mt-5 max-w-[320px] text-[12px] leading-6 text-white/65 sm:text-[13px]">
                Manage patients, laboratory tests, samples, results and
                reports through one secure and connected platform.
              </p>
            </div>

            {/* FOOTER */}
            <div className="relative z-10 mt-10 flex items-center gap-3 text-[10px] text-white/45">
              <span className="h-1.5 w-1.5 shrink-0 bg-[#2ca6c9]" />
              Secure laboratory operations
            </div>
          </div>

          {/* RIGHT LOGIN PANEL */}
          <div className="flex min-h-[440px] items-center bg-white px-6 py-9 sm:px-9 sm:py-10 lg:min-h-[530px] lg:px-10">
            <div className="mx-auto w-full max-w-[380px]">

              {/* HEADING */}
              <div className="mb-8">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-[#1682a9]">
                  Welcome back
                </p>

                <h2 className="text-[28px] font-bold leading-tight tracking-[-0.7px] text-[#172536] sm:text-[31px]">
                  Sign in to your account
                </h2>

                <p className="mt-3 text-[13px] leading-5 text-[#7d8c9d]">
                  Enter your credentials to access your laboratory workspace.
                </p>
              </div>

              {/* LOGIN FORM */}
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* EMAIL */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-[12px] font-bold uppercase tracking-[0.04em] text-[#344557]"
                  >
                    Email Address
                  </label>

                  <div className="relative">
                    <Mail
                      size={18}
                      strokeWidth={1.8}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8494a5]"
                    />

                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Enter your email address"
                      className="h-12 w-full border border-[#d7e1eb] bg-[#f8fafc] pl-12 pr-4 text-[13px] text-[#243447] outline-none transition placeholder:text-[#9aa8b6] focus:border-[#1682a9] focus:bg-white focus:ring-2 focus:ring-[#1682a9]/10"
                    />
                  </div>
                </div>

                {/* PASSWORD */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-[12px] font-bold uppercase tracking-[0.04em] text-[#344557]"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      size={18}
                      strokeWidth={1.8}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8494a5]"
                    />

                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      className="h-12 w-full border border-[#d7e1eb] bg-[#f8fafc] pl-12 pr-4 text-[13px] text-[#243447] outline-none transition placeholder:text-[#9aa8b6] focus:border-[#1682a9] focus:bg-white focus:ring-2 focus:ring-[#1682a9]/10"
                    />
                  </div>
                </div>

                <div className="-mt-2 text-right">
                  <a href="/forgot-password" className="text-[13px] font-semibold text-[#1682a9] transition hover:text-[#087eae]">
                    Forgot password?
                  </a>
                </div>

                {/* ERROR MESSAGE */}
                {error && (
                  <div
                    role="alert"
                    className="border border-[#f1caca] bg-[#fff5f5] px-4 py-3 text-[12px] leading-5 text-[#c24141]"
                  >
                    {error}
                  </div>
                )}

                {/* SIGN IN BUTTON */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 flex h-12 w-full items-center justify-center gap-2 bg-[#087eae] text-[13px] font-bold tracking-[0.02em] text-white transition hover:bg-[#066f9b] focus:outline-none focus:ring-2 focus:ring-[#087eae]/30 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin border-2 border-white/40 border-t-white" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight size={17} strokeWidth={2} />
                    </>
                  )}
                </button>
              </form>

              {/* FOOTER */}
              <div className="mt-8 border-t border-[#edf1f5] pt-5">
                <p className="text-center text-[11px] text-[#9aa7b5]">
                  Authorized laboratory personnel only
                </p>
              </div>

            </div>
          </div>

        </section>
      </div>
    </main>
  );
}
