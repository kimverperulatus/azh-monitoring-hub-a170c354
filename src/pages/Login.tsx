import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Lock, Mail, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex bg-brand-navy-950">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-brand-navy-900 via-brand-navy-800 to-brand-navy-950 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-brand-red-700/10 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] rounded-full bg-brand-navy-400/10 blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-red-700 flex items-center justify-center shadow-lg">
              <span className="text-primary-foreground font-bold text-lg">C</span>
            </div>
            <span className="text-primary-foreground font-bold text-xl tracking-tight">Carebox</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-primary-foreground leading-tight">
              Application Status<br />Audits
            </h1>
            <p className="text-brand-navy-200 text-lg leading-relaxed max-w-sm">
              Monitor EKV records, scan letters, and track application statuses in one place.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {["EKV Record Management", "AI-Powered Letter Scanning", "Role-Based Access Control"].map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-red-400" />
                <span className="text-brand-navy-200 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-brand-navy-400 text-xs">© {new Date().getFullYear()} Carebox · Internal Dashboard</p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-brand-navy-950">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-red-700 flex items-center justify-center">
              <span className="text-primary-foreground font-bold">C</span>
            </div>
            <span className="text-primary-foreground font-bold text-lg">Carebox</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-primary-foreground">Welcome back</h2>
            <p className="text-brand-navy-400 text-sm">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-brand-navy-300 uppercase tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-navy-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-brand-navy-900 border border-brand-navy-700 rounded-xl pl-10 pr-4 py-3 text-sm text-primary-foreground placeholder:text-brand-navy-500 focus:outline-none focus:ring-2 focus:ring-brand-red-600 focus:border-transparent transition-all"
                  placeholder="you@carebox.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-brand-navy-300 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-navy-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-brand-navy-900 border border-brand-navy-700 rounded-xl pl-10 pr-10 py-3 text-sm text-primary-foreground placeholder:text-brand-navy-500 focus:outline-none focus:ring-2 focus:ring-brand-red-600 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-navy-500 hover:text-brand-navy-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 bg-brand-red-950/60 border border-brand-red-800/50 text-brand-red-400 text-sm px-3.5 py-3 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-brand-red-700 hover:bg-brand-red-600 disabled:opacity-50 text-primary-foreground font-semibold py-3 rounded-xl text-sm transition-colors shadow-lg shadow-brand-red-900/30 mt-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="text-center text-brand-navy-600 text-xs">
            Internal use only · Carebox Monitoring System
          </p>
        </div>
      </div>
    </div>
  );
}
