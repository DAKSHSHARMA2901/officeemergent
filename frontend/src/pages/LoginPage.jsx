import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex" data-testid="login-page">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-end p-12"
        style={{
          backgroundImage: `url(https://images.unsplash.com/photo-1760875506684-83ba574f64ce?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODR8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMG1vZGVybiUyMGRhcmslMjBvZmZpY2UlMjBhcmNoaXRlY3R1cmV8ZW58MHx8fHwxNzcxMzI5NDAzfDA&ixlib=rb-4.1.0&q=85)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent" />
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/30 flex items-center justify-center backdrop-blur-sm">
              <Shield className="w-5 h-5 text-indigo-400" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Manrope' }}>TaskOps</h1>
          </div>
          <p className="text-lg text-zinc-300 leading-relaxed" style={{ fontFamily: 'Public Sans' }}>
            Streamline your office workflows with role-based task management and real-time access control.
          </p>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md bg-[#121214] border-white/5" data-testid="login-card">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2 lg:hidden mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-indigo-400" strokeWidth={1.5} />
              </div>
              <span className="text-lg font-bold text-white" style={{ fontFamily: 'Manrope' }}>TaskOps</span>
            </div>
            <CardTitle className="text-2xl font-bold text-white" style={{ fontFamily: 'Manrope' }}>Sign in</CardTitle>
            <CardDescription className="text-zinc-500">Enter your credentials to access your workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-400 text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:ring-indigo-500/20"
                  data-testid="login-email-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-400 text-sm">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:ring-indigo-500/20 pr-10"
                    data-testid="login-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    data-testid="toggle-password-visibility"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                disabled={loading}
                data-testid="login-submit-btn"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-zinc-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-indigo-400 hover:text-indigo-300 transition-colors" data-testid="register-link">
                Create account
              </Link>
            </p>
            <div className="mt-6 p-3 rounded-md bg-white/5 border border-white/5">
              <p className="text-[11px] text-zinc-500 font-mono mb-2">Demo Credentials:</p>
              <div className="space-y-1 text-[11px] font-mono text-zinc-400">
                <p>Admin: admin@office.com / admin123</p>
                <p>Manager: manager@office.com / manager123</p>
                <p>Employee: john@office.com / employee123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
