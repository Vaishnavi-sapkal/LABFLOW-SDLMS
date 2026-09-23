import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { patientSignup, resendVerification } from '../api/auth';

export function PatientSignup() {
  const [form, setForm] = useState({ fullName: '', dateOfBirth: '', gender: 'female' as 'male' | 'female' | 'other', mobile: '', email: '', password: '', consentToTesting: false, consentToDetailsVerification: false });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!form.consentToTesting || !form.consentToDetailsVerification) {
      setError('Both consent confirmations are required.');
      return;
    }
    setLoading(true);
    try {
      const result = await patientSignup(form);
      setMessage(result.message);
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : 'Unable to register.');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError('');
    try {
      const result = await resendVerification(form.email);
      setMessage(result.message);
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : 'Unable to resend verification.');
    }
  };

  const update = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  return <main className="min-h-screen bg-[#f4f7fb] px-4 py-8 sm:py-12"><section className="mx-auto max-w-xl border border-[#d8e2ec] bg-white p-6 shadow-[0_16px_38px_rgba(15,35,60,0.10)] sm:p-9"><p className="text-xs font-semibold uppercase tracking-[.13em] text-[#1682a9]">Patient portal</p><h1 className="mt-2 text-3xl font-bold text-[#172536]">Create your account</h1><p className="mt-3 text-sm text-[#7d8c9d]">Register for LabFlow and verify your email before signing in.</p>{message ? <div className="mt-6 border border-green-200 bg-green-50 p-4 text-sm text-green-800">{message}<button className="ml-2 font-semibold underline" onClick={() => void resend()} type="button">Resend email</button></div> : <form className="mt-6 grid gap-4" onSubmit={submit}><label className="grid gap-1 text-sm font-medium">Full name<input className="h-11 border border-[#d7e1eb] px-3" required value={form.fullName} onChange={(event) => update('fullName', event.target.value)} /></label><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1 text-sm font-medium">Date of birth<input className="h-11 border border-[#d7e1eb] px-3" required type="date" value={form.dateOfBirth} onChange={(event) => update('dateOfBirth', event.target.value)} /></label><label className="grid gap-1 text-sm font-medium">Gender<select className="h-11 border border-[#d7e1eb] px-3" value={form.gender} onChange={(event) => update('gender', event.target.value)}><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select></label></div><label className="grid gap-1 text-sm font-medium">Mobile number<input className="h-11 border border-[#d7e1eb] px-3" required type="tel" value={form.mobile} onChange={(event) => update('mobile', event.target.value)} /></label><label className="grid gap-1 text-sm font-medium">Email<input autoComplete="email" className="h-11 border border-[#d7e1eb] px-3" required type="email" value={form.email} onChange={(event) => update('email', event.target.value)} /></label><label className="grid gap-1 text-sm font-medium">Password<input autoComplete="new-password" className="h-11 border border-[#d7e1eb] px-3" minLength={6} required type="password" value={form.password} onChange={(event) => update('password', event.target.value)} /></label><label className="flex gap-2 text-sm"><input checked={form.consentToTesting} type="checkbox" onChange={(event) => update('consentToTesting', event.target.checked)} /> I consent to diagnostic testing and digital report delivery.</label><label className="flex gap-2 text-sm"><input checked={form.consentToDetailsVerification} type="checkbox" onChange={(event) => update('consentToDetailsVerification', event.target.checked)} /> I confirm that my details are accurate.</label><button className="h-11 bg-[#087eae] font-bold text-white disabled:opacity-70" disabled={loading} type="submit">{loading ? 'Creating account…' : 'Create patient account'}</button></form>}{error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}<p className="mt-6 text-center text-sm text-[#7d8c9d]">Already have an account? <Link className="font-semibold text-[#1682a9]" to="/login">Sign in</Link></p></section></main>;
}
