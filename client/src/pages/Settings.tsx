import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, Check, Copy, CreditCard, Key, Shield, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { apiService } from '../services/api';
import { useAuthStore } from '../store/authStore';
import type { UserProfile } from '../types/app';

interface MockKey {
  name: string;
  key: string;
  created: string;
}

export default function Settings() {
  const { signOut } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile>({ name: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    apiService
      .getUserProfile()
      .then((data) => {
        setProfile(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        toast.error('Failed to load profile');
        setLoading(false);
      });
  }, []);

  const handleUpdateProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    try {
      const updatedProfile = await apiService.updateUserProfile({ name: profile.name });
      setProfile(updatedProfile);
      toast.success('Profile updated securely.');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const copyKey = (keyString: string) => {
    void navigator.clipboard.writeText(keyString);
    setCopiedKey(keyString);
    toast.success('API Key copied to clipboard');
    window.setTimeout(() => setCopiedKey(null), 2000);
  };

  const mockKeys: MockKey[] = [
    { name: 'Prod AI Sandbox', key: 'forgex_sk_948271048_prod', created: '2026-03-31' },
    { name: 'Local Test Gateway', key: 'forgex_sk_114299882_test', created: '2026-04-01' },
  ];

  if (loading) {
    return <div className="p-12 text-center text-text-secondary animate-pulse-slow">Loading settings...</div>;
  }

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">
          Manage your account preferences, API keys, and billing metrics.
        </p>
      </div>

      <div className="grid md:grid-cols-[250px_1fr] gap-10">
        <div className="hidden md:flex flex-col gap-2">
          <Button variant="ghost" className="justify-start gap-3 bg-background-secondary text-text-primary">
            <User className="w-4 h-4" /> Profile Details
          </Button>
          <Button variant="ghost" className="justify-start gap-3">
            <Key className="w-4 h-4" /> API Keys
          </Button>
          <Button variant="ghost" className="justify-start gap-3">
            <CreditCard className="w-4 h-4" /> Billing & Usage
          </Button>
          <Button variant="ghost" className="justify-start gap-3">
            <Shield className="w-4 h-4" /> Security
          </Button>
        </div>

        <div className="space-y-12">
          <section id="profile" className="animate-fade-in-up">
            <h2 className="text-xl font-bold text-text-primary mb-6 border-b border-background-border pb-2">
              Profile Details
            </h2>
            <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-md">
              <Input
                label="Full Name"
                value={profile.name}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, name: event.target.value }))
                }
              />
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={profile.email}
                  className="w-full bg-background-secondary text-text-secondary border border-background-border rounded-lg px-4 py-2 opacity-70 cursor-not-allowed"
                />
                <p className="text-xs text-text-secondary mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Email tied to identity provider.
                </p>
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile Changes'}
              </Button>
            </form>
          </section>

          <section id="apikeys" className="animate-fade-in-up">
            <div className="flex justify-between items-center mb-6 border-b border-background-border pb-2">
              <h2 className="text-xl font-bold text-text-primary">ForgeAPI Access Keys</h2>
              <Button variant="secondary" className="text-xs py-1">
                Generate New Key
              </Button>
            </div>

            <div className="space-y-4">
              {mockKeys.map((keyItem) => (
                <div
                  key={keyItem.key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-background-card border border-background-border rounded-xl"
                >
                  <div>
                    <p className="font-semibold text-text-primary text-sm">{keyItem.name}</p>
                    <p className="text-xs text-text-secondary mt-1 font-mono">
                      {keyItem.key.substring(0, 15)}**********
                    </p>
                  </div>
                  <div className="flex items-center gap-4 mt-4 sm:mt-0">
                    <span className="text-xs text-text-secondary">Created: {keyItem.created}</span>
                    <button
                      type="button"
                      onClick={() => copyKey(keyItem.key)}
                      className="text-text-secondary hover:text-accent-primary transition bg-background-secondary p-2 rounded-md"
                    >
                      {copiedKey === keyItem.key ? (
                        <Check className="w-4 h-4 text-accent-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="billing" className="animate-fade-in-up">
            <h2 className="text-xl font-bold text-text-primary mb-6 border-b border-background-border pb-2">
              Compute Usage (Current Cycle)
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
              <div className="p-5 border border-background-border rounded-xl bg-background-primary">
                <p className="text-sm font-medium text-text-secondary">AI Container Seconds</p>
                <div className="flex items-end gap-2 mt-2">
                  <h3 className="text-3xl font-bold text-text-primary">14,204</h3>
                  <span className="text-sm text-text-secondary mb-1">/ 50,000 limit</span>
                </div>
                <div className="w-full h-1.5 bg-background-secondary rounded-full mt-4 overflow-hidden">
                  <div className="h-full bg-accent-primary w-[28%]"></div>
                </div>
              </div>

              <div className="p-5 border border-background-border rounded-xl bg-background-primary">
                <p className="text-sm font-medium text-text-secondary">Agent Generation Cycles</p>
                <div className="flex items-end gap-2 mt-2">
                  <h3 className="text-3xl font-bold text-text-primary">42</h3>
                  <span className="text-sm text-text-secondary mb-1">/ 100 limit</span>
                </div>
                <div className="w-full h-1.5 bg-background-secondary rounded-full mt-4 overflow-hidden">
                  <div className="h-full bg-blue-400 w-[42%]"></div>
                </div>
              </div>
            </div>
          </section>

          <section id="danger" className="animate-fade-in-up border-t border-background-border pt-12">
            <h2 className="text-xl font-bold text-accent-danger mb-4">Danger Zone</h2>
            <div className="p-5 border border-accent-danger/30 rounded-xl bg-accent-danger/5">
              <h3 className="text-sm font-semibold text-text-primary mb-1">Sign Out Everywhere</h3>
              <p className="text-sm text-text-secondary mb-4">
                Invalidate all sessions across all devices and force sign out.
              </p>
              <Button variant="danger" onClick={() => void signOut()}>
                Sign out securely
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
