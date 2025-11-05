import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Store, Lock, Mail, Eye, EyeOff, Loader2, Clock } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const { login, isLoading, resetRateLimit, isRateLimited } = useAuth();
  const { companyInfo } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();

  // Always redirect to dashboard after login
  const from = '/';

  // Cooldown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRateLimited) {
      setCooldownTime(10); // 10 seconds cooldown
      interval = setInterval(() => {
        setCooldownTime(prev => {
          if (prev <= 1) {
            setError('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCooldownTime(0);
    }
    return () => clearInterval(interval);
  }, [isRateLimited]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    const success = await login(email, password);
    if (success) {
      // Always redirect to dashboard after successful login
      navigate(from, { replace: true });
    } else {
      // Check if it's a rate limiting issue
      if (isRateLimited) {
        setError('Too many login attempts. Please wait a moment before trying again.');
      } else {
        setError('Invalid email or password');
      }
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            {companyInfo?.logo ? (
              <img
                src={companyInfo.logo}
                alt="Company Logo"
                className="h-12 w-12 rounded-lg object-cover shadow-lg"
              />
            ) : (
              <div className="bg-green-600 text-white p-3 rounded-xl shadow-lg">
                <Store className="h-8 w-8" />
              </div>
            )}
            <div className="text-left">
              <h1 className="text-2xl font-bold text-gray-900">{companyInfo?.name || 'Savera Electronic'}</h1>
              <p className="text-sm text-gray-600">Business Management</p>
            </div>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            {isSignup ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-gray-600">
            {isSignup 
              ? 'Enter your details to create your account' 
              : 'Sign in to your business dashboard'
            }
          </p>
        </div>

        {/* Login Form */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">
              {isSignup ? 'Sign Up' : 'Sign In'}
            </CardTitle>
            <CardDescription className="text-center">
              Access your business management dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800 flex items-center gap-2">
                    {cooldownTime > 0 && <Clock className="h-4 w-4" />}
                    {error}
                    {cooldownTime > 0 && (
                      <span className="font-semibold">
                        Try again in {cooldownTime}s
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full h-11 bg-green-600 hover:bg-green-700 text-white"
                disabled={isLoading || cooldownTime > 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Signing In...
                  </>
                ) : cooldownTime > 0 ? (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Wait {cooldownTime}s
                  </>
                ) : (
                  isSignup ? 'Create Account' : 'Sign In'
                )}
              </Button>

              {/* Reset Rate Limit Button */}
              {isRateLimited && cooldownTime > 0 && (
                <Button 
                  type="button"
                  variant="outline"
                  className="w-full h-10 text-sm"
                  onClick={resetRateLimit}
                >
                  Reset Login Attempts
                </Button>
              )}
            </form>

            <div className="text-center">
              <button
                onClick={() => setIsSignup(!isSignup)}
                className="text-sm text-green-600 hover:text-green-700 font-medium"
                disabled={isLoading}
              >
                {isSignup 
                  ? 'Already have an account? Sign in' 
                  : "Don't have an account? Sign up"
                }
              </button>
            </div>
          </CardContent>
        </Card>


        {/* Rate Limit Reset Button */}
        {isRateLimited && (
          <div className="text-center">
            <button
              onClick={resetRateLimit}
              className="text-sm text-red-600 hover:text-red-700 font-medium underline"
            >
              Reset Rate Limit
            </button>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-sm text-gray-600">
          © 2024 {companyInfo?.name || "ElectroMart"}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
