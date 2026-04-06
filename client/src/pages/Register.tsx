import { useState, type FormEvent } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import NeonTunnelBackdrop from '../components/background/NeonTunnelBackdrop';
import { supabase } from '../config/supabase';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/');
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        await supabase.from('users').upsert([
          {
            id: data.user.id,
            name,
            email,
          },
        ], { onConflict: 'id' });
      }

      toast.success('Registration successful! Check your email or login directly.');
      navigate('/dashboard');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Error occurred during registration'));
    } finally {
      setLoading(false);
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
          <h2 className="mb-2 text-center text-3xl font-bold text-text-primary">Create Account</h2>
          <p className="mb-8 text-center text-text-secondary">Start building APIs in seconds</p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">Full Name</label>
              <input
                type="text"
                required
                className="w-full rounded-xl border border-white/12 bg-black/25 px-4 py-3 text-text-primary outline-none transition focus:border-[#6f7dff] focus:bg-black/35"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="John Doe"
              />
            </div>
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
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">
                Confirm Password
              </label>
              <input
                type="password"
                required
                className="w-full rounded-xl border border-white/12 bg-black/25 px-4 py-3 text-text-primary outline-none transition focus:border-[#6f7dff] focus:bg-black/35"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="********"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-accent-primary px-4 py-3 font-medium text-white shadow-lg shadow-accent-primary/25 transition hover:bg-accent-primary/90 disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-text-secondary">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-accent-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
