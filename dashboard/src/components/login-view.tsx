import React, { useState } from 'react';
import KenLogo from './logo';

interface LoginViewProps {
  onLoginSuccess: (data: {
    token: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: 'SUPER_ADMIN' | 'CLIENT_CEO' | 'MEMBER';
      companyId: string;
      companyName: string;
    };
    projects: Array<{ id: string; name: string; apiKey: string }>;
  }) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#05090F] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#0C1322] border border-[#1E293B] rounded-lg p-8 relative z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center mb-1">
            <KenLogo size={36} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Kenzo_DAP</h1>
          <p className="text-xs text-slate-400">Sign in to your account</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs px-3.5 py-2.5 rounded-md flex items-center gap-2">
            <span className="font-semibold">Error:</span> {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="kenzo-input w-full py-2 text-xs placeholder-slate-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="kenzo-input w-full py-2 text-xs placeholder-slate-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="kenzo-btn-primary w-full justify-center py-2.5 text-xs font-semibold disabled:opacity-50 mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
          </button>
        </form>
      </div>
    </div>
  );
}
