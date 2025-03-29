import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ProfileProvider, useProfile } from './ProfileContext';
import * as AuthService from '@/services/AuthService';

interface AuthContextType {
  user: User | null;
  signUp: (
    email: string, 
    password: string, 
    userData: {
      first_name: string;
      last_name: string;
      role: 'patient' | 'doctor';
      age?: number;
      specialty?: string;
    }
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  isAuthenticated: boolean;
  // Add profile property for backward compatibility
  profile: {
    id: string;
    first_name: string;
    last_name: string;
    role: 'patient' | 'doctor';
    age?: number;
    specialty?: string;
  } | null;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  signUp: async () => { console.error("AuthProvider not initialized") },
  signIn: async () => { console.error("AuthProvider not initialized") },
  signOut: async () => { console.error("AuthProvider not initialized") },
  loading: true,
  isAuthenticated: false,
  profile: null // Add default profile value
});

// Create a combined provider that includes both auth and profile
export const AuthProfileProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ProfileProvider>
      <AuthProviderInternal>
        {children}
      </AuthProviderInternal>
    </ProfileProvider>
  );
};

// Internal Auth Provider that uses the Profile context
const AuthProviderInternal = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { fetchProfile, isProfileFetching, profile } = useProfile();
  const navigate = useNavigate();
  const [lastFetchedId, setLastFetchedId] = useState<string | null>(null);

  useEffect(() => {
    console.log('AuthProvider mounted, setting up auth state listener');
    let isInitializing = true;
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
          
          // Only fetch profile if the user ID changed or on specific events
          // This prevents infinite fetching loops
          if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && 
              lastFetchedId !== session.user.id) {
            setLastFetchedId(session.user.id);
            fetchProfile(session.user.id);
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
          setLastFetchedId(null);
        }
        
        // Only set loading to false after both authentication and profile check
        if (event === 'SIGNED_OUT' || !isInitializing) {
          setLoading(false);
        }
      }
    );
    
    // Initial session check
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
          
          // Only fetch profile if we haven't already fetched for this user
          if (lastFetchedId !== session.user.id) {
            setLastFetchedId(session.user.id);
            await fetchProfile(session.user.id);
          }
        }
        
        // Always set loading to false after initialization is complete
        setLoading(false);
        isInitializing = false;
      } catch (error) {
        console.error('Error checking auth session:', error);
        // Make sure to set loading to false on error too
        setLoading(false);
        isInitializing = false;
      }
    };
    
    initializeAuth();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile, lastFetchedId]);

  const signUp = async (
    email: string,
    password: string,
    userData: {
      first_name: string;
      last_name: string;
      role: 'patient' | 'doctor';
      age?: number;
      specialty?: string;
    }
  ) => {
    setLoading(true);
    try {
      await AuthService.signUp(email, password, userData);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      await AuthService.signIn(email, password);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await AuthService.signOut();
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    signUp,
    signIn,
    signOut,
    loading: loading || isProfileFetching,
    isAuthenticated,
    profile // Add profile to the context value
  };

  return (
    <AuthContext.Provider value={value}>
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

// For backward compatibility, export AuthProvider as well
export const AuthProvider = AuthProfileProvider;
