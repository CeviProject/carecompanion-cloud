
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

  // Function to clear auth state completely
  const clearAuthState = () => {
    console.log('Clearing auth state');
    setSession(null);
    setUser(null);
    setProfile(null);
    setIsAuthenticated(false);
  };

  // Function to fetch profile for a user
  const fetchProfile = async (userId: string) => {
    console.log('Fetching profile for user:', userId);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      
      console.log('Profile fetched:', data);
      return data;
    } catch (error) {
      console.error('Exception fetching profile:', error);
      return null;
    }
  };

  // Set up auth state management
  useEffect(() => {
    console.log('AuthProvider mounted, setting up auth state listener');
    let subscription: { unsubscribe: () => void } | null = null;
    
    // Function to properly set up auth state listener
    const setupAuthListener = async () => {
      try {
        // First clear any existing auth state to prevent stale data
        clearAuthState();
        
        // Set up auth state listener
        const { data } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          console.log('Auth state changed:', event, newSession?.user?.id);
          
          if (event === 'SIGNED_OUT' || !newSession) {
            console.log('SIGNED_OUT event detected or no session, clearing state');
            clearAuthState();
            // Force navigate to home on sign out
            navigate('/', { replace: true });
            return;
          }
          
          // For all other auth events, update the session and user
          setSession(newSession);
          setUser(newSession.user);
          setIsAuthenticated(!!newSession.user);
          
          if (newSession.user) {
            const profileData = await fetchProfile(newSession.user.id);
            setProfile(profileData);
            
            // Navigate to appropriate dashboard if user is on auth pages
            const currentPath = window.location.pathname;
            if (currentPath === '/' || currentPath.startsWith('/auth/')) {
              console.log('Redirecting to dashboard for role:', profileData?.role || 'patient');
              navigate(`/dashboard/${profileData?.role || 'patient'}`);
            }
          }
        });
        
        subscription = data.subscription;
        
        // Check for existing session
        console.log('Checking for existing session');
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        console.log('Existing session check result:', !!existingSession);
        
        if (existingSession) {
          setSession(existingSession);
          setUser(existingSession.user);
          setIsAuthenticated(!!existingSession.user);
          
          if (existingSession.user) {
            const profileData = await fetchProfile(existingSession.user.id);
            setProfile(profileData);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error setting up auth:', error);
        setLoading(false);
      }
    };
    
    // Initialize auth
    setupAuthListener();
    
    // Cleanup function
    return () => {
      console.log('AuthProvider unmounting, unsubscribing from auth state changes');
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [navigate]);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting sign in for email:', email);
      setLoading(true);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error.message);
        throw error;
      }

      // Auth state change listener will handle the session update
      toast.success('Login successful!');
    } catch (error: any) {
      console.error('Sign in catch block error:', error.message);
      toast.error(error.message || 'Failed to sign in');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      console.log('Attempting sign up for email:', email);
      setLoading(true);
      
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
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out...');
      setLoading(true);
      
      // First clear local state to ensure immediate UI update
      clearAuthState();
      
      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error during sign-out:', error);
        throw error;
      }
      
      console.log('Successfully signed out from Supabase');
      
      // Force a browser storage clear for auth
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('supabase.auth.expires_at');
      
      // Force navigate to home page
      navigate('/', { replace: true });
      toast.success('Logged out successfully');
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.error(error.message || 'Failed to sign out');
      // Still navigate to home even if there was an error
      navigate('/', { replace: true });
    } finally {
      setLoading(false);
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
