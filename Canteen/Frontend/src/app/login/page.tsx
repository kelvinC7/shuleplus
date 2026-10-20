'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Lock } from 'lucide-react';
import { storeToken, storeRefreshToken } from '@/shared/auth-token';

const IAM_API_URL = process.env.NEXT_PUBLIC_IAM_API_URL ?? 'http://localhost:3001/api/v1';

const LoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${IAM_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe: true }),
      });

      const data = await res.json();

      if (!res.ok || !data.data?.accessToken) {
        setError(data.message || 'Login failed. Please check your credentials.');
        setLoading(false);
        return;
      }

      storeToken(data.data.accessToken);
      if (data.data.refreshToken) storeRefreshToken(data.data.refreshToken);

      router.replace('/app/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('Could not reach the server. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navblue p-4 text-xs">
      <form onSubmit={handleSubmit} className="flex flex-col space-y-6 rounded-2xl md:min-w-[400px]">
        <div className="flex items-center justify-center space-x-3 mb-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_white.png" alt="Logo" className="w-10 h-10" />
          <h1 className="text-white text-3xl font-bold">
            <span className="text-shuleamber">Shule</span>Canteen
          </h1>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-xs font-bold text-center">
            {error}
          </div>
        )}

        <div className="flex flex-col space-y-1">
          <label htmlFor="email" className="text-white text-lg md:text-sm">Email</label>
          <div className="flex items-center space-x-3 border-b border-white/30 pb-1 focus-within:border-shuleamber transition-all duration-300">
            <Phone className="text-white text-base" />
            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-transparent text-white outline-none w-full placeholder:text-white/20 text-sm py-1"
              required
            />
          </div>
        </div>

        <div className="flex flex-col space-y-1">
          <label htmlFor="password" className="text-white text-lg md:text-sm">Password</label>
          <div className="flex items-center space-x-3 border-b border-white/30 pb-1 focus-within:border-shuleamber transition-all duration-300">
            <Lock className="text-white text-base" />
            <input
              type="password"
              id="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-transparent text-white outline-none w-full placeholder:text-white/20 text-sm py-1"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-white text-navblue font-black py-3 px-6 rounded-full hover:bg-shuleamber hover:text-white active:scale-[0.98] transition-all transform duration-300 shadow-xl text-sm mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <footer className="flex flex-col items-center space-y-6 mt-12 pb-8">
          <div className="flex items-center space-x-4">
            <div className="h-[1px] w-12 bg-linear-to-r from-transparent to-white/10"></div>
            <div className="flex items-center space-x-1.5 whitespace-nowrap">
              <span className="text-white/40 text-xs font-bold">Managed by</span>
              <span className="text-white font-black text-lg leading-none tracking-tighter">
                EDU<span className="text-shuleamber">POTO</span>
              </span>
            </div>
            <div className="h-[1px] w-12 bg-linear-to-l from-transparent to-white/10"></div>
          </div>
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-2 opacity-30">
              <div className="w-1 h-1 rounded-full bg-shuleamber"></div>
              <p className="text-white text-xs font-bold">
                © {new Date().getFullYear()} Edupoto Global. All rights reserved.
              </p>
              <div className="w-1 h-1 rounded-full bg-shuleamber"></div>
            </div>
          </div>
        </footer>
      </form>
    </div>
  );
};

export default LoginPage;
