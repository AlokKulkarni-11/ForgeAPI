import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function Navbar() {
  const { isAuthenticated, signOut } = useAuthStore();

  return (
    <nav className="sticky top-0 z-50 w-full px-4 pt-4">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,20,40,0.78),rgba(9,12,24,0.6))] px-5 shadow-[0_18px_60px_rgba(5,8,26,0.38)] backdrop-blur-2xl">
        <Link to="/" className="flex items-center gap-2">
          <span className="bg-gradient-to-r from-[#7a8cff] via-[#c7d2ff] to-[#8ae7ff] bg-clip-text pb-0.5 text-[1.62rem] font-bold leading-[1.08] tracking-tight text-transparent md:text-[1.78rem]">
            ForgeAPI
          </span>
        </Link>
        <div className="flex items-center gap-4">
          {!isAuthenticated ? (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-full border border-[#7384ff]/40 bg-[#6272ff]/85 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6f7dff]"
              >
                Start Building Free
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/dashboard"
                className="text-sm font-medium text-text-secondary hover:text-text-primary"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                className="text-sm font-medium text-text-secondary hover:text-text-primary"
              >
                Log out
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
