
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Login = () => {
  const { signIn, loading: authLoading, isAuthenticated, profile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showGoogleAlert, setShowGoogleAlert] = useState(false);

  // If user is already authenticated, redirect to dashboard
  if (!authLoading && isAuthenticated && profile) {
    console.log('User already authenticated, redirecting from login page');
    const redirectPath = profile.role === 'patient' 
      ? '/patient/overview' 
      : `/dashboard/${profile.role || 'patient'}`;
    return <Navigate to={redirectPath} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await signIn(email, password);
      console.log('Login successful, redirecting will be handled by AuthContext');
      // Redirect will be handled by AuthContext onAuthStateChange
    } catch (error) {
      console.error('Login error:', error);
      // Error is already handled in the AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  // Function to display Google OAuth test mode info
  const handleGoogleInfoClick = () => {
    setShowGoogleAlert(!showGoogleAlert);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md animate-scale-in">
          <div className="glass-card p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
              <p className="text-muted-foreground">Sign in to your VirtualHealth account</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link 
                    to="/auth/forgot-password" 
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full rounded-full" 
                disabled={isLoading || authLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
            
            {/* Google OAuth info alert */}
            <div className="mt-4">
              <button 
                type="button"
                onClick={handleGoogleInfoClick}
                className="text-xs flex items-center gap-1 text-amber-600 hover:text-amber-700"
              >
                <AlertCircle className="h-3 w-3" />
                Having trouble with Google sign-in?
              </button>
              
              {showGoogleAlert && (
                <Alert variant="destructive" className="mt-2 bg-amber-50 text-amber-800 border-amber-200">
                  <AlertDescription className="text-xs">
                    Google OAuth is in test mode. For security reasons, Google only allows developer-approved test users
                    to access the application. Please use email/password login instead, or contact the developer to be added as a test user.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link 
                  to="/auth/register" 
                  className="text-primary hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Login;
