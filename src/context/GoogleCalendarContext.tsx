
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface GoogleCalendarContextType {
  isConnected: boolean;
  isLoading: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  addEventToCalendar: (event: {
    summary: string;
    description: string;
    startTime: string;
    endTime: string;
  }) => Promise<any>;
}

const GoogleCalendarContext = createContext<GoogleCalendarContextType>({
  isConnected: false,
  isLoading: false,
  connect: async () => { console.error("GoogleCalendarProvider not initialized") },
  disconnect: async () => { console.error("GoogleCalendarProvider not initialized") },
  addEventToCalendar: async () => { console.error("GoogleCalendarProvider not initialized") }
});

export const GoogleCalendarProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchAttempted, setFetchAttempted] = useState(false);
  
  useEffect(() => {
    console.log('GoogleCalendarProvider mounted');
    
    return () => {
      console.log('GoogleCalendarProvider unmounting');
    };
  }, []);
  
  useEffect(() => {
    if (user && !fetchAttempted) {
      checkTokens();
    }
    
    return () => {
      // Clean up code if needed
    };
  }, [user]);
  
  const checkTokens = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setFetchAttempted(true);
      console.log('Fetching tokens from database for user:', user.id);
      
      const { data, error } = await supabase.functions.invoke('google-calendar-event', {
        body: { 
          action: 'get_tokens',
          userId: user.id
        }
      });
      
      console.log('Tokens response from database:', data);
      
      if (error) {
        console.error('Error fetching tokens:', error);
        return;
      }
      
      if (data && data.found) {
        setIsConnected(true);
      } else {
        console.log('No Google Calendar tokens found for this user');
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Error checking tokens:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const connect = async () => {
    if (!user) {
      toast.error('You must be logged in to connect Google Calendar');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('google-calendar-event', {
        body: { 
          action: 'authorize',
          userId: user.id
        }
      });
      
      if (error) throw error;
      
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error('Failed to get authorization URL');
      }
    } catch (error: any) {
      console.error('Error starting Google Calendar authorization:', error);
      toast.error(error.message || 'Failed to start Google Calendar authorization');
    } finally {
      setIsLoading(false);
    }
  };
  
  const disconnect = async () => {
    if (!user) {
      toast.error('You must be logged in to disconnect Google Calendar');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('google-calendar-event', {
        body: { 
          action: 'revoke',
          userId: user.id
        }
      });
      
      if (error) throw error;
      
      setIsConnected(false);
      toast.success('Google Calendar disconnected successfully');
    } catch (error: any) {
      console.error('Error disconnecting Google Calendar:', error);
      toast.error(error.message || 'Failed to disconnect Google Calendar');
    } finally {
      setIsLoading(false);
    }
  };
  
  const addEventToCalendar = async (event: {
    summary: string;
    description: string;
    startTime: string;
    endTime: string;
  }) => {
    if (!user) {
      toast.error('You must be logged in to add events to Google Calendar');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // First get tokens
      const { data: tokens, error: tokensError } = await supabase.functions.invoke('google-calendar-event', {
        body: { 
          action: 'get_tokens',
          userId: user.id
        }
      });
      
      if (tokensError) throw tokensError;
      
      if (!tokens || !tokens.found || !tokens.access_token) {
        throw new Error('You need to connect Google Calendar first');
      }
      
      // Then create event
      const { data, error } = await supabase.functions.invoke('google-calendar-event', {
        body: { 
          action: 'create',
          accessToken: tokens.access_token,
          event
        }
      });
      
      if (error) throw error;
      
      toast.success('Event added to Google Calendar');
      return data;
    } catch (error: any) {
      console.error('Error adding event to Google Calendar:', error);
      toast.error(error.message || 'Failed to add event to Google Calendar');
    } finally {
      setIsLoading(false);
    }
  };
  
  const value = {
    isConnected,
    isLoading,
    connect,
    disconnect,
    addEventToCalendar
  };
  
  return (
    <GoogleCalendarContext.Provider value={value}>
      {children}
    </GoogleCalendarContext.Provider>
  );
};

export const useGoogleCalendar = () => {
  const context = useContext(GoogleCalendarContext);
  if (context === undefined) {
    throw new Error('useGoogleCalendar must be used within a GoogleCalendarProvider');
  }
  return context;
};
