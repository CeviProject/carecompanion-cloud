
import { createContext, useContext, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  role: 'patient' | 'doctor';
  age?: number;
  specialty?: string;
}

interface ProfileContextType {
  profile: Profile | null;
  isProfileFetching: boolean;
  fetchProfile: (userId: string) => Promise<void>;
}

// Create context with default values
const ProfileContext = createContext<ProfileContextType>({
  profile: null,
  isProfileFetching: false,
  fetchProfile: async () => { console.error("ProfileProvider not initialized") }
});

export const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isProfileFetching, setIsProfileFetching] = useState(false);
  const [lastFetchedId, setLastFetchedId] = useState<string | null>(null);

  const fetchProfile = async (userId: string) => {
    // Skip if we're already fetching this user's profile or if it's the same user
    if (isProfileFetching || (lastFetchedId === userId && profile?.id === userId)) {
      return;
    }

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
        setLastFetchedId(userId);
      } else {
        console.log('No profile found for user');
        setProfile(null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setIsProfileFetching(false);
    }
  };

  const value = {
    profile,
    isProfileFetching,
    fetchProfile
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
