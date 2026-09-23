import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '../api/auth';

export function VerifyEmail() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email address…');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); setMessage('This verification link is missing its token.'); return; }
    void verifyEmail(token).then((result) => { setStatus('success'); setMessage(result.message); }).catch((error) => { setStatus('error'); setMessage(error instanceof Error ? error.message : 'Unable to verify your email.'); });
  }, [params]);

  return <main className="grid min-h-screen place-items-center bg-[#f4f7fb] p-4"><section className="w-full max-w-md border border-[#d8e2ec] bg-white p-8 text-center shadow-[0_16px_38px_rgba(15,35,60,0.10)]"><h1 className="text-2xl font-bold text-[#172536]">Email verification</h1><p className={`mt-4 text-sm ${status === 'error' ? 'text-red-700' : 'text-[#526273]'}`}>{message}</p>{status === 'loading' ? <span className="mx-auto mt-6 block h-6 w-6 animate-spin border-2 border-[#087eae]/30 border-t-[#087eae]" /> : null}{status === 'success' ? <Link className="mt-6 inline-block bg-[#087eae] px-5 py-3 text-sm font-bold text-white" to="/login">Go to login</Link> : null}</section></main>;
}
