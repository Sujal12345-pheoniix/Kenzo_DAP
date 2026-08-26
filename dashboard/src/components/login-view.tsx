import React, { useState } from 'react';
import { Lock, Mail, ArrowRight } from 'lucide-react';
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
    <div className="min-h-screen w-screen bg-[#05090f] text-white flex items-center justify-center p-4 relative overflow-hidden font-sans antialiased">
      {/* Dynamic Background Glow Rings */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/05 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md kenzo-glass-card rounded-3xl p-8 shadow-2xl relative z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center mb-1">
            <KenLogo size={46} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-syne">Kenzo_DAP</h1>
          <p className="text-xs text-slate-400 font-medium">Enterprise Digital Adoption Platform</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs px-4 py-3 rounded-2xl flex items-center gap-2">
            <span className="font-semibold">Error:</span> {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@kenzoinfosystems.com"
                className="w-full bg-[#070d18] border border-slate-700/80 focus:border-sky-400 text-white text-xs rounded-xl pl-10 pr-4 py-2.5 outline-none transition-all placeholder-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#070d18] border border-slate-700/80 focus:border-sky-400 text-white text-xs rounded-xl pl-10 pr-4 py-2.5 outline-none transition-all placeholder-slate-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full kenzo-glow-btn text-white font-bold text-xs py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
            <ArrowRight size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
