
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export interface GoogleCalendarContextType {
  isEnabled: boolean;
  isAuthorizing: boolean;
  isLoading: boolean;
  authorizeGoogleCalendar: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  addEvent: (eventDetails: {
    summary: string;
    description?: string;
    location?: string;
    start: Date;
    end: Date;
    attendees?: { email: string }[];
    reminders?: { method: string; minutes: number }[];
  }) => Promise<boolean>;
}

const GoogleCalendarContext = createContext<GoogleCalendarContextType>({
  isEnabled: false,
  isAuthorizing: false,
  isLoading: true,
  authorizeGoogleCalendar: async () => {},
  getAccessToken: async () => null,
  addEvent: async () => false,
});

export const GoogleCalendarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

  const fetchGoogleCalendarToken = async () => {
    if (!user || hasAttemptedFetch) return;
    
    setHasAttemptedFetch(true);
    setIsLoading(true);
    
    try {
      console.log('Fetching Google Calendar token for user:', user.id);
      const { data, error } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google_calendar')
        .single();
      
      if (error) {
        if (error.code !== 'PGRST116') { // Not found error code
          console.error('Error fetching Google Calendar integration:', error);
        }
        setIsEnabled(false);
        setAccessToken(null);
        return;
      }
      
      if (data) {
        console.log('Google Calendar integration found');
        setIsEnabled(true);
        setAccessToken(data.access_token);
        
        // Check if token needs refresh
        const expiresAt = new Date(data.expires_at);
        const now = new Date();
        const expiresInMs = expiresAt.getTime() - now.getTime();
        
        if (expiresInMs < 300000) { // Less than 5 minutes remaining
          console.log('Token expiring soon, refreshing...');
          await refreshToken();
        }
      } else {
        setIsEnabled(false);
        setAccessToken(null);
      }
    } catch (error) {
      console.error('Error in fetchGoogleCalendarToken:', error);
      setIsEnabled(false);
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshToken = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_integrations')
        .select('refresh_token')
        .eq('user_id', user.id)
        .eq('provider', 'google_calendar')
        .single();
      
      if (error || !data?.refresh_token) {
        throw new Error('Refresh token not found');
      }
      
      const response = await fetch('/api/google-calendar/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          refresh_token: data.refresh_token,
          user_id: user.id
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }
      
      const result = await response.json();
      setAccessToken(result.access_token);
      
    } catch (error) {
      console.error('Error refreshing token:', error);
      setIsEnabled(false);
      setAccessToken(null);
    }
  };

  const authorizeGoogleCalendar = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to connect Google Calendar",
        variant: "destructive"
      });
      return;
    }
    
    setIsAuthorizing(true);
    
    try {
      // Generate a random state value for security
      const state = Math.random().toString(36).substring(2, 15);
      
      // Store the state in localStorage to verify on callback
      localStorage.setItem('googleAuthState', state);
      
      // Create the OAuth URL
      const redirectUri = `${window.location.origin}/auth/google/callback`;
      const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar');
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${process.env.VITE_GOOGLE_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${scope}` +
        `&access_type=offline` +
        `&prompt=consent` +
        `&state=${state}`;
      
      // Redirect the user to the Google authorization page
      window.location.href = authUrl;
      
    } catch (error) {
      console.error('Error initiating Google Calendar authorization:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to Google Calendar",
        variant: "destructive"
      });
    } finally {
      setIsAuthorizing(false);
    }
  };

  const getAccessToken = async (): Promise<string | null> => {
    if (accessToken) return accessToken;
    
    // Try to fetch a fresh token
    if (user && !isLoading && !hasAttemptedFetch) {
      await fetchGoogleCalendarToken();
    }
    
    return accessToken;
  };

  const addEvent = async (eventDetails: {
    summary: string;
    description?: string;
    location?: string;
    start: Date;
    end: Date;
    attendees?: { email: string }[];
    reminders?: { method: string; minutes: number }[];
  }): Promise<boolean> => {
    try {
      const token = await getAccessToken();
      
      if (!token) {
        toast({
          title: "Not Connected",
          description: "Please connect your Google Calendar first",
          variant: "destructive"
        });
        return false;
      }
      
      // Call our edge function to create the event
      const response = await fetch('/api/google-calendar-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(eventDetails)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to add event: ${response.statusText}`);
      }
      
      toast({
        title: "Event Added",
        description: "Successfully added to your Google Calendar",
      });
      
      return true;
      
    } catch (error) {
      console.error('Error adding event to Google Calendar:', error);
      toast({
        title: "Failed to Add Event",
        description: "Could not add the event to your Google Calendar",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    if (user) {
      fetchGoogleCalendarToken();
    } else {
      setIsEnabled(false);
      setAccessToken(null);
      setIsLoading(false);
    }
  }, [user]);

  const contextValue: GoogleCalendarContextType = {
    isEnabled,
    isAuthorizing,
    isLoading,
    authorizeGoogleCalendar,
    getAccessToken,
    addEvent
  };

  return (
    <GoogleCalendarContext.Provider value={contextValue}>
      {children}
    </GoogleCalendarContext.Provider>
  );
};

export const useGoogleCalendar = () => useContext(GoogleCalendarContext);
