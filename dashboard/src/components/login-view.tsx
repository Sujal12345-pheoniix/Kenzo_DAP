import React, { useState } from 'react';
import { Shield, Lock, Mail, ArrowRight, Building } from 'lucide-react';
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

  const handleQuickLogin = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setError(null);
  };

  return (
    <div className="min-h-screen w-screen bg-[#0d0f17] text-white flex items-center justify-center p-4 relative overflow-hidden font-sans antialiased">
      {/* Dynamic Background Glow Rings */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#161926]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center mb-2">
            <KenLogo size={44} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white font-outfit">Kenzo_DAP</h1>
          <p className="text-xs text-zinc-400 font-medium">Enterprise Digital Adoption Platform</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
            <span className="font-semibold">Error:</span> {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300 mb-1.5 block">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-zinc-900/80 border border-zinc-700/80 focus:border-indigo-500 text-white text-xs rounded-xl pl-10 pr-4 py-2.5 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 mb-1.5 block">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-900/80 border border-zinc-700/80 focus:border-indigo-500 text-white text-xs rounded-xl pl-10 pr-4 py-2.5 outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
            <ArrowRight size={14} />
          </button>
        </form>

        {/* Quick Demo Access Credentials */}
        <div className="border-t border-zinc-800/80 pt-4 space-y-3">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block text-center">
            Quick Demo Login Presets
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickLogin('Kenzo@gmail.com', 'kenzo123')}
              className="bg-zinc-900/90 hover:bg-zinc-800 border border-indigo-500/30 text-left p-2.5 rounded-xl transition-all"
            >
              <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-xs">
                <Shield size={12} />
                <span>Super Admin</span>
              </div>
              <span className="text-[10px] text-zinc-400 block truncate mt-0.5">Kenzo@gmail.com</span>
            </button>

            <button
              onClick={() => handleQuickLogin('client1@kenzo.com', 'client@123')}
              className="bg-zinc-900/90 hover:bg-zinc-800 border border-purple-500/30 text-left p-2.5 rounded-xl transition-all"
            >
              <div className="flex items-center gap-1.5 text-purple-400 font-bold text-xs">
                <Building size={12} />
                <span>Client CEO</span>
              </div>
              <span className="text-[10px] text-zinc-400 block truncate mt-0.5">client1@kenzo.com</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
