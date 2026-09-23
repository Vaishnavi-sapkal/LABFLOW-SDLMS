import { FormEvent, useState } from 'react';
import { ArrowRight, LockKeyhole, TestTubeDiagonal } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import { resetPassword } from '../api/auth';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');
    const token = searchParams.get('token');

    if (!token) { setError('This password reset link is invalid or expired.'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      const response = await resetPassword(token, newPassword);
      setMessage(response.message);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Unable to reset password. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#f4f7fb] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <div className="w-full max-w-[900px]"><section className="grid w-full overflow-hidden border border-[#d8e2ec] bg-white shadow-[0_16px_38px_rgba(15,35,60,0.10)] lg:grid-cols-2">
        <div className="relative flex min-h-[360px] flex-col justify-between overflow-hidden bg-[#0b2945] px-6 py-7 text-white sm:min-h-[420px] sm:px-9 sm:py-8 lg:min-h-[530px] lg:px-10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 border border-white/[0.08]" /><div className="pointer-events-none absolute -bottom-28 -left-24 h-64 w-64 border border-white/[0.08]" /><div className="pointer-events-none absolute right-5 top-1/2 h-32 w-32 border border-white/[0.05]" />
          <div className="relative z-10 flex items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center bg-[#08a6c8]"><TestTubeDiagonal size={22} strokeWidth={1.8} className="text-white" /></div><div><h1 className="text-[18px] font-bold leading-none tracking-[0.02em]">LabFlow</h1><p className="mt-1 text-[8px] font-medium uppercase tracking-[0.22em] text-[#6da8c0]">Diagnostics</p></div></div>
          <div className="relative z-10 mt-12 lg:mt-14"><div className="mb-4 h-[2px] w-11 bg-[#2ca6c9]" /><p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#76c8dc] sm:text-[10px]">Smart Laboratory Platform</p><h2 className="max-w-[350px] text-[28px] font-bold leading-[1.18] tracking-[-0.7px] sm:text-[34px] lg:text-[36px]">Smarter diagnostics.<br />Better care.</h2><p className="mt-5 max-w-[320px] text-[12px] leading-6 text-white/65 sm:text-[13px]">Manage patients, laboratory tests, samples, results and reports through one secure and connected platform.</p></div>
          <div className="relative z-10 mt-10 flex items-center gap-3 text-[10px] text-white/45"><span className="h-1.5 w-1.5 shrink-0 bg-[#2ca6c9]" />Secure laboratory operations</div>
        </div>
        <div className="flex min-h-[440px] items-center bg-white px-6 py-9 sm:px-9 sm:py-10 lg:min-h-[530px] lg:px-10"><div className="mx-auto w-full max-w-[380px]">
          <div className="mb-8"><p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-[#1682a9]">Password reset</p><h2 className="text-[28px] font-bold leading-tight tracking-[-0.7px] text-[#172536] sm:text-[31px]">Set a new password</h2><p className="mt-3 text-[13px] leading-5 text-[#7d8c9d]">Choose a new password for your laboratory workspace.</p></div>
          <form onSubmit={handleSubmit} className="space-y-5"><div><label htmlFor="newPassword" className="mb-2 block text-[12px] font-bold uppercase tracking-[0.04em] text-[#344557]">New Password</label><div className="relative"><LockKeyhole size={18} strokeWidth={1.8} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8494a5]" /><input id="newPassword" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Enter a new password" className="h-12 w-full border border-[#d7e1eb] bg-[#f8fafc] pl-12 pr-4 text-[13px] text-[#243447] outline-none transition placeholder:text-[#9aa8b6] focus:border-[#1682a9] focus:bg-white focus:ring-2 focus:ring-[#1682a9]/10" /></div></div><div><label htmlFor="confirmPassword" className="mb-2 block text-[12px] font-bold uppercase tracking-[0.04em] text-[#344557]">Confirm Password</label><div className="relative"><LockKeyhole size={18} strokeWidth={1.8} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8494a5]" /><input id="confirmPassword" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm your new password" className="h-12 w-full border border-[#d7e1eb] bg-[#f8fafc] pl-12 pr-4 text-[13px] text-[#243447] outline-none transition placeholder:text-[#9aa8b6] focus:border-[#1682a9] focus:bg-white focus:ring-2 focus:ring-[#1682a9]/10" /></div></div>
            {error && <div role="alert" className="border border-[#f1caca] bg-[#fff5f5] px-4 py-3 text-[12px] leading-5 text-[#c24141]">{error}</div>}{message && <div className="border border-[#b9dec9] bg-[#f2fbf5] px-4 py-3 text-[12px] leading-5 text-[#287a45]">{message} <Link to="/login" className="font-semibold underline">Go to login</Link></div>}
            <button type="submit" disabled={loading} className="mt-1 flex h-12 w-full items-center justify-center gap-2 bg-[#087eae] text-[13px] font-bold tracking-[0.02em] text-white transition hover:bg-[#066f9b] focus:outline-none focus:ring-2 focus:ring-[#087eae]/30 disabled:cursor-not-allowed disabled:opacity-70">{loading ? <><span className="h-4 w-4 animate-spin border-2 border-white/40 border-t-white" />Resetting...</> : <><span>Reset Password</span><ArrowRight size={17} strokeWidth={2} /></>}</button>
          </form>
        </div></div>
      </section></div>
    </main>
  );
}
