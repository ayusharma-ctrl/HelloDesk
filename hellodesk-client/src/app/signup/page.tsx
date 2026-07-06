"use client";

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'}/api/v1/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.get('email'),
        password: form.get('password'),
        name: form.get('name'),
        workspaceName: form.get('workspaceName')
      })
    });

    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? 'Signup failed');
      return;
    }
    localStorage.setItem('token', data.token);
    router.push('/inbox');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Create a Workspace</h1>
        <p className="text-slate-500 mb-6">Get started with HelloDesk today.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Your Name</label>
            <Input name="name" placeholder="Jane Doe" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <Input name="email" type="email" placeholder="jane@example.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Workspace Name</label>
            <Input name="workspaceName" placeholder="Acme Inc" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <Input name="password" type="password" placeholder="••••••••" required minLength={6} />
          </div>

          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating workspace...' : 'Sign up'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Already have an account? <Link href="/login" className="text-blue-600 hover:underline">Log in</Link>
        </div>
      </div>
    </div>
  );
}
