'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (mode === 'signup') {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const payload = await response.json();
        setError(payload.error ?? 'Unable to create your account.');
        return;
      }
    }

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Invalid email or password.');
      return;
    }

    router.push('/recipes');
    router.refresh();
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="mb-6 flex gap-2 rounded-lg bg-slate-100 p-1">
        <button type="button" className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${mode === 'signin' ? 'bg-white shadow' : 'text-slate-600'}`} onClick={() => setMode('signin')}>Sign in</button>
        <button type="button" className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${mode === 'signup' ? 'bg-white shadow' : 'text-slate-600'}`} onClick={() => setMode('signup')}>Sign up</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Jamie" />
          </label>
        )}

        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="you@example.com" required />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="••••••••" required />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" className="w-full">
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </Button>
      </form>
    </div>
  );
}
