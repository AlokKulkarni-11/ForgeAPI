import { useState, type FormEvent } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import NeonTunnelBackdrop from '../components/background/NeonTunnelBackdrop';
import { supabase } from '../config/supabase';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerificationHint, setShowVerificationHint] = useState(false);
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/');
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setShowVerificationHint(false);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      toast.success('Logged in successfully!');
      navigate('/dashboard');
    } catch (error) {
      const message = getErrorMessage(error, 'Error occurred during login');

      if (message.toLowerCase().includes('email not confirmed')) {
        setShowVerificationHint(true);
        toast.error('Check your mail and complete verification before signing in.');
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGithub = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
      });

      if (error) {
        throw error;
      }
    } catch {
      toast.error('GitHub login failed');
    }
  };

  return (
    <div className="relative isolate flex min-h-[calc(100vh-5rem)] items-center justify-center overflow-hidden bg-[#05060b] px-4 py-10">
      <NeonTunnelBackdrop className="opacity-90" />

      <div className="relative z-10 w-full max-w-md">
        <button
          type="button"
          onClick={handleBack}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-medium text-text-primary backdrop-blur-xl transition hover:border-[#6f7dff]/50 hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(13,16,34,0.84),rgba(8,10,22,0.74))] p-8 shadow-[0_24px_120px_rgba(27,38,111,0.45)] backdrop-blur-2xl">
          <h2 className="mb-2 text-center text-3xl font-bold text-text-primary">Welcome Back</h2>
          <p className="mb-8 text-center text-text-secondary">Sign in to your ForgeAPI account</p>

          <div className="mb-6 rounded-2xl border border-[#6f7dff]/25 bg-[#0f1534]/70 px-4 py-3 text-sm text-[#cfd6ff]">
            If you just created your account, check your email and complete verification before
            signing in.
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">Email</label>
              <input
                type="email"
                required
                className="w-full rounded-xl border border-white/12 bg-black/25 px-4 py-3 text-text-primary outline-none transition focus:border-[#6f7dff] focus:bg-black/35"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">Password</label>
              <input
                type="password"
                required
                className="w-full rounded-xl border border-white/12 bg-black/25 px-4 py-3 text-text-primary outline-none transition focus:border-[#6f7dff] focus:bg-black/35"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="********"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-accent-primary px-4 py-3 font-medium text-white shadow-lg shadow-accent-primary/25 transition hover:bg-accent-primary/90 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {showVerificationHint && (
            <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              Check your mail and complete verification, then come back and sign in.
            </div>
          )}

          <div className="mt-6 flex items-center justify-center space-x-2">
            <span className="h-px w-full bg-white/10" />
            <span className="text-sm font-medium text-text-secondary">OR</span>
            <span className="h-px w-full bg-white/10" />
          </div>

          <button
            type="button"
            onClick={() => void handleGithub()}
            className="mt-6 flex w-full items-center justify-center space-x-2 rounded-xl border border-white/12 bg-white/6 px-4 py-3 font-medium text-text-primary backdrop-blur-xl transition hover:border-[#6f7dff]/50 hover:bg-white/10"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <span>Continue with GitHub</span>
          </button>

          <p className="mt-8 text-center text-sm text-text-secondary">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-accent-primary hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
