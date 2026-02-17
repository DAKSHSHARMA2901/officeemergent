import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) { toast.error('Please fill in all fields'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success('Account created!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-8" data-testid="register-page">
      <Card className="w-full max-w-md bg-[#121214] border-white/5" data-testid="register-card">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-indigo-400" strokeWidth={1.5} />
            </div>
            <span className="text-lg font-bold text-white" style={{ fontFamily: 'Manrope' }}>TaskOps</span>
          </div>
          <CardTitle className="text-2xl font-bold text-white" style={{ fontFamily: 'Manrope' }}>Create account</CardTitle>
          <CardDescription className="text-zinc-500">Join your team's workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-400 text-sm">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500"
                data-testid="register-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-400 text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500"
                data-testid="register-email-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-400 text-sm">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500 pr-10"
                  data-testid="register-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  data-testid="register-toggle-password"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              disabled={loading}
              data-testid="register-submit-btn"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-zinc-500">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors" data-testid="login-link">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
