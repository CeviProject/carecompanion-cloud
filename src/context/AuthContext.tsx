
import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: any | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('AuthProvider mounted, setting up auth state listener');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        setIsAuthenticated(!!session?.user); // Update authentication flag
        
        if (session?.user) {
          console.log('Fetching profile for user:', session.user.id);
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          
          if (error) {
            console.error('Error fetching profile:', error);
          } else {
            console.log('Profile fetched:', data);
            setProfile(data);
            
            // Navigate to appropriate dashboard if user is on auth pages
            const currentPath = window.location.pathname;
            if (currentPath === '/' || currentPath.startsWith('/auth/')) {
              console.log('Redirecting to dashboard for role:', data?.role || 'patient');
              navigate(`/dashboard/${data?.role || 'patient'}`);
            }
          }
        } else {
          console.log('No user session, clearing profile');
          setProfile(null);
        }

        setLoading(false);
      }
    );

    // THEN check for existing session
    console.log('Checking for existing session');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Existing session check result:', !!session);
      setSession(session);
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session?.user); // Update authentication flag
      
      if (session?.user) {
        console.log('Fetching profile for existing user:', session.user.id);
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) {
              console.error('Error fetching profile for existing user:', error);
            } else {
              console.log('Profile fetched for existing user:', data);
              setProfile(data);
              
              // Check if user is on auth pages and redirect if needed
              const currentPath = window.location.pathname;
              if (currentPath === '/' || currentPath.startsWith('/auth/')) {
                console.log('Redirecting existing user to dashboard for role:', data?.role || 'patient');
                navigate(`/dashboard/${data?.role || 'patient'}`);
              }
            }
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => {
      console.log('AuthProvider unmounting, unsubscribing from auth state changes');
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting sign in for email:', email);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error.message);
        throw error;
      }

      toast.success('Login successful!');
      // Let the onAuthStateChange handler navigate based on user role
    } catch (error: any) {
      console.error('Sign in catch block error:', error.message);
      toast.error(error.message || 'Failed to sign in');
      throw error;
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      console.log('Attempting sign up for email:', email);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });

      if (error) {
        console.error('Sign up error:', error.message);
        throw error;
      }

      toast.success('Registration successful! Please check your email for verification.');
    } catch (error: any) {
      console.error('Sign up catch block error:', error.message);
      toast.error(error.message || 'Failed to sign up');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out...');
      // First attempt the sign out
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error during sign-out:', error);
        throw error;
      }
      
      console.log('Successfully signed out from Supabase');
      
      // Clear local state
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsAuthenticated(false);
      
      // Navigate to home page
      console.log('Navigating to home page');
      navigate('/', { replace: true });
      toast.success('Logged out successfully');
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.error(error.message || 'Failed to sign out');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        isAuthenticated,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
