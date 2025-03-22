
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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
  
  // Use a ref to track if the component is mounted
  const isMounted = useRef(true);
  // Track if we're currently signing out to prevent race conditions
  const isSigningOut = useRef(false);
  // Track the auth subscription
  const authSubscription = useRef<{ unsubscribe: () => void } | null>(null);

  // Function to clear auth state completely
  const clearAuthState = useCallback(() => {
    console.log('Clearing auth state');
    if (isMounted.current) {
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsAuthenticated(false);
    }
  }, []);

  // Function to fetch profile for a user
  const fetchProfile = useCallback(async (userId: string) => {
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
  }, []);

  // Function to handle auth state changes
  const handleAuthChange = useCallback(async (event: string, newSession: Session | null) => {
    console.log(`Auth state changed: ${event}`, newSession?.user?.id);
    
    if (event === 'SIGNED_OUT' || !newSession) {
      console.log('SIGNED_OUT event detected or no session, clearing state');
      clearAuthState();
      return;
    }
    
    if (isSigningOut.current) {
      console.log('Currently signing out, ignoring auth change');
      return;
    }
    
    if (isMounted.current) {
      setSession(newSession);
      setUser(newSession.user);
      setIsAuthenticated(!!newSession.user);
      
      if (newSession.user) {
        const profileData = await fetchProfile(newSession.user.id);
        if (isMounted.current) {
          setProfile(profileData);
        }
      }
    }
  }, [clearAuthState, fetchProfile]);

  // Set up auth state management
  useEffect(() => {
    console.log('AuthProvider mounted, setting up auth state listener');
    setLoading(true);
    isMounted.current = true;
    
    // Clean up any existing subscription first
    if (authSubscription.current) {
      console.log('Cleaning up existing auth subscription');
      authSubscription.current.unsubscribe();
      authSubscription.current = null;
    }
    
    // Set up new auth state listener
    const setupAuth = async () => {
      try {
        // Set up the auth state listener
        const { data } = supabase.auth.onAuthStateChange(handleAuthChange);
        authSubscription.current = data.subscription;
        
        // Check for existing session
        console.log('Checking for existing session');
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (isMounted.current) setLoading(false);
          return;
        }
        
        console.log('Existing session check result:', !!existingSession);
        
        if (existingSession && isMounted.current) {
          setSession(existingSession);
          setUser(existingSession.user);
          setIsAuthenticated(!!existingSession.user);
          
          if (existingSession.user) {
            const profileData = await fetchProfile(existingSession.user.id);
            if (isMounted.current) {
              setProfile(profileData);
            }
          }
        }
        
        if (isMounted.current) setLoading(false);
      } catch (error) {
        console.error('Error setting up auth:', error);
        if (isMounted.current) setLoading(false);
      }
    };
    
    setupAuth();
    
    // Cleanup function
    return () => {
      console.log('AuthProvider unmounting, unsubscribing from auth state changes');
      isMounted.current = false;
      
      if (authSubscription.current) {
        authSubscription.current.unsubscribe();
        authSubscription.current = null;
      }
    };
  }, [handleAuthChange, fetchProfile]);

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
      if (isMounted.current) setLoading(false);
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
      if (isMounted.current) setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out...');
      if (isSigningOut.current) {
        console.log('Already signing out, ignoring duplicate request');
        return;
      }
      
      isSigningOut.current = true;
      if (isMounted.current) setLoading(true);
      
      // First clear local state to ensure immediate UI update
      clearAuthState();
      
      // Force remove all tokens from storage before calling signOut
      // This is a more aggressive approach to ensure we clear everything
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('sb-') || key.includes('auth')) {
          console.log(`Removing storage key: ${key}`);
          localStorage.removeItem(key);
        }
      });
      
      // Also explicitly remove the main auth token
      localStorage.removeItem('sb-irkihiedlszoufsjglhw-auth-token');
      
      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut({
        scope: 'global' // Use global scope to sign out from all devices
      });
      
      if (error) {
        console.error('Error during sign-out:', error);
        throw error;
      }
      
      console.log('Successfully signed out from Supabase');
      
      // Force a browser storage clear one more time for all auth-related items
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('sb-') || key.includes('auth')) {
          localStorage.removeItem(key);
        }
      });
      
      // Force reset the client
      try {
        // @ts-ignore - Access internal reset method
        if (typeof supabase.auth._reset === 'function') {
          // @ts-ignore
          supabase.auth._reset();
        }
      } catch (e) {
        console.error('Error resetting Supabase client:', e);
      }
      
      // Force navigate to home page
      navigate('/', { replace: true });
      toast.success('Logged out successfully');
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.error(error.message || 'Failed to sign out');
      // Still navigate to home even if there was an error
      navigate('/', { replace: true });
    } finally {
      isSigningOut.current = false;
      if (isMounted.current) setLoading(false);
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
