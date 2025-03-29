
import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  role: 'patient' | 'doctor';
  age?: number;
  specialty?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
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
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  signUp: async () => { console.error("AuthProvider not initialized") },
  signIn: async () => { console.error("AuthProvider not initialized") },
  signOut: async () => { console.error("AuthProvider not initialized") },
  loading: true,
  isAuthenticated: false
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProfileFetching, setIsProfileFetching] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('AuthProvider mounted, setting up auth state listener');
    
    // First check for existing session
    console.log('Checking for existing session');

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
          
          if (!isProfileFetching && !profile) {
            fetchProfile(session.user.id);
          }
        } else {
          setUser(null);
          setProfile(null);
          setIsAuthenticated(false);
        }
        
        // Only set loading to false after both authentication and profile check
        if (event === 'SIGNED_OUT') {
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
          await fetchProfile(session.user.id);
        } else {
          // Explicitly set loading to false if no session
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking auth session:', error);
        // Make sure to set loading to false on error too
        setLoading(false);
      }
    };
    
    initializeAuth();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  const fetchProfile = async (userId: string) => {
    try {
      setIsProfileFetching(true);
      console.log('Fetching profile for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        throw error;
      }
      
      if (data) {
        console.log('Profile fetched:', data);
        setProfile(data as Profile);
      } else {
        console.log('No profile found for user');
        setProfile(null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setIsProfileFetching(false);
      // Ensure loading is set to false after profile fetch
      setLoading(false);
    }
  };

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
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: userData
        }
      });
      if (error) {
        console.error('Signup error:', error);
        toast.error(error.message);
      } else {
        console.log('Signup successful:', data);
        toast.success('Signup successful! Please check your email to verify your account.');
        navigate('/');
      }
    } catch (error: any) {
      console.error('Unexpected signup error:', error);
      toast.error(error.message || 'An unexpected error occurred during signup.');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      if (error) {
        console.error('Signin error:', error);
        toast.error(error.message);
      } else {
        console.log('Signin successful:', data);
        toast.success('Signin successful!');
      }
    } catch (error: any) {
      console.error('Unexpected signin error:', error);
      toast.error(error.message || 'An unexpected error occurred during signin.');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Signout error:', error);
        toast.error(error.message);
      } else {
        console.log('Signout successful');
        toast.success('Signout successful!');
        navigate('/');
      }
    } catch (error: any) {
      console.error('Unexpected signout error:', error);
      toast.error(error.message || 'An unexpected error occurred during signout.');
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    profile,
    signUp,
    signIn,
    signOut,
    loading: loading || isProfileFetching,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context;
};
