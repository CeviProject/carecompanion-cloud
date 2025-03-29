
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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

interface UserIntegration {
  user_id: string;
  provider: string;
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
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
  const isFetchingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const fetchGoogleCalendarToken = async () => {
    if (!user || isFetchingRef.current) return null;
    
    try {
      isFetchingRef.current = true;
      console.log('Fetching Google Calendar token for user:', user.id);
      
      // Call our edge function to get tokens safely
      const response = await fetch('/api/google-calendar-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get_tokens',
          userId: user.id
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch tokens');
      }
      
      const result = await response.json();
      
      if (result.found && result.access_token) {
        console.log('Google Calendar integration found');
        setIsEnabled(true);
        setAccessToken(result.access_token);
        return result.access_token;
      } else {
        console.log('No Google Calendar integration found');
        setIsEnabled(false);
        setAccessToken(null);
        return null;
      }
    } catch (error) {
      console.error('Error in fetchGoogleCalendarToken:', error);
      setIsEnabled(false);
      setAccessToken(null);
      return null;
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
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
    
    // Only try to fetch a fresh token if not already loading and we haven't tried yet
    if (user && !isLoading && !isFetchingRef.current) {
      return await fetchGoogleCalendarToken();
    }
    
    return null;
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
        },
        body: JSON.stringify({
          action: 'create',
          accessToken: token,
          event: {
            summary: eventDetails.summary,
            description: eventDetails.description || '',
            location: eventDetails.location || '',
            startTime: eventDetails.start.toISOString(),
            endTime: eventDetails.end.toISOString(),
            attendees: eventDetails.attendees || [],
            reminders: eventDetails.reminders || [
              { method: 'email', minutes: 24 * 60 },
              { method: 'popup', minutes: 30 }
            ]
          }
        })
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
    // Only initialize once when the component mounts or when user changes
    if (user && !hasInitializedRef.current && !isFetchingRef.current) {
      hasInitializedRef.current = true;
      fetchGoogleCalendarToken();
    } else if (!user) {
      // Reset when user logs out
      setIsEnabled(false);
      setAccessToken(null);
      setIsLoading(false);
      hasInitializedRef.current = false;
    }
  }, [user]);

  // Setup message listener for OAuth callback
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      const allowedOrigins = [window.location.origin];
      if (!allowedOrigins.includes(event.origin)) return;
      
      if (event.data.type === 'google_auth_callback' && event.data.code) {
        console.log('Received auth code from popup');
        // Process the auth code
        processAuthCode(event.data.code);
      }
    };
    
    // Check if we have a code stored in localStorage (as fallback)
    const checkStoredAuthCode = () => {
      const storedCode = localStorage.getItem('google_auth_code');
      const timestamp = localStorage.getItem('google_auth_timestamp');
      
      if (storedCode && timestamp) {
        // Only use codes that are less than 5 minutes old
        const age = Date.now() - parseInt(timestamp, 10);
        if (age < 5 * 60 * 1000) {
          console.log('Found stored auth code, processing');
          processAuthCode(storedCode);
          
          // Clean up after processing
          localStorage.removeItem('google_auth_code');
          localStorage.removeItem('google_auth_timestamp');
        }
      }
    };
    
    const processAuthCode = async (code: string) => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        const response = await fetch('/api/google-calendar-event', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'token',
            code,
            userId: user.id
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to exchange code for tokens');
        }
        
        const data = await response.json();
        
        if (data.access_token) {
          setAccessToken(data.access_token);
          setIsEnabled(true);
          toast({
            title: "Connected!",
            description: "Google Calendar connected successfully",
          });
        }
      } catch (error) {
        console.error('Error processing auth code:', error);
        toast({
          title: "Connection Failed",
          description: "Could not connect to Google Calendar",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    window.addEventListener('message', handleMessage);
    checkStoredAuthCode();
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
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
