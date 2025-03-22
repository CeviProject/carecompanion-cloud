
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GoogleCalendarTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
}

interface GoogleCalendarContextType {
  isEnabled: boolean;
  authorizeGoogleCalendar: () => Promise<void>;
  disconnectGoogleCalendar: () => void;
  getAccessToken: () => Promise<string | null>;
}

const GoogleCalendarContext = createContext<GoogleCalendarContextType | undefined>(undefined);

export const GoogleCalendarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [tokens, setTokens] = useState<GoogleCalendarTokens | null>(null);
  const authWindowRef = React.useRef<Window | null>(null);
  const authCheckIntervalRef = React.useRef<number | null>(null);

  useEffect(() => {
    // Check if Google Calendar is enabled
    const localEnabled = localStorage.getItem('googleCalendarEnabled');
    if (localEnabled === 'true') {
      setIsEnabled(true);
    }
    
    // Initialize tokens from localStorage if available
    const tokensStr = localStorage.getItem('googleCalendarTokens');
    if (tokensStr) {
      try {
        const storedTokens = JSON.parse(tokensStr);
        setTokens(storedTokens);
        console.log('Initialized tokens from localStorage:', storedTokens);
      } catch (e) {
        console.error('Error parsing Google Calendar tokens:', e);
      }
    }
    
    // If user is logged in, check for tokens in database
    if (user) {
      fetchTokensFromDatabase();
    }

    // Clean up interval on unmount
    return () => {
      if (authCheckIntervalRef.current) {
        window.clearInterval(authCheckIntervalRef.current);
        authCheckIntervalRef.current = null;
      }
    };
  }, [user]);

  const fetchTokensFromDatabase = async () => {
    if (!user) return;
    
    try {
      console.log('Fetching tokens from database for user:', user.id);
      const { data, error } = await supabase.functions.invoke('google-calendar-event', {
        body: { 
          action: 'get_tokens',
          userId: user.id
        }
      });
      
      if (error) {
        console.error('Error fetching Google Calendar tokens:', error);
        return;
      }
      
      console.log('Tokens response from database:', data);
      
      if (data && data.found && data.access_token) {
        const newTokens = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_in: data.expires_in,
          expires_at: Date.now() + (data.expires_in * 1000)
        };
        
        console.log('Setting tokens from database:', newTokens);
        setTokens(newTokens);
        setIsEnabled(true);
        
        // Update localStorage
        localStorage.setItem('googleCalendarTokens', JSON.stringify(newTokens));
        localStorage.setItem('googleCalendarEnabled', 'true');
      } else if (data && !data.found) {
        console.log('No Google Calendar tokens found for this user');
        // Clear any stale token data
        setTokens(null);
        setIsEnabled(false);
        localStorage.removeItem('googleCalendarTokens');
        localStorage.setItem('googleCalendarEnabled', 'false');
      }
    } catch (error) {
      console.error('Error fetching Google Calendar tokens:', error);
    }
  };

  const authorizeGoogleCalendar = async () => {
    try {
      console.log('Starting Google Calendar authorization process');
      // Get the authorization URL
      const { data, error } = await supabase.functions.invoke('google-calendar-event', {
        body: { action: 'authorize' }
      });
      
      if (error) {
        console.error('Error getting authorization URL:', error);
        toast.error('Failed to connect to Google Calendar');
        return;
      }
      
      console.log('Received authorization URL:', data?.authUrl);
      
      // Close any existing auth window
      if (authWindowRef.current && !authWindowRef.current.closed) {
        authWindowRef.current.close();
      }
      
      // Clear any existing interval
      if (authCheckIntervalRef.current) {
        window.clearInterval(authCheckIntervalRef.current);
        authCheckIntervalRef.current = null;
      }
      
      // Open the authorization URL in a new window with noopener to prevent COOP issues
      authWindowRef.current = window.open(
        data.authUrl, 
        'googleAuthWindow', 
        'width=500,height=600,noopener,noreferrer'
      );
      
      if (!authWindowRef.current) {
        toast.error('Popup blocked. Please allow popups for this site.');
        return;
      }
      
      // Set up message listener
      const handleAuthCallback = async (event: MessageEvent) => {
        // Only process messages from our expected origin
        if (event.origin !== window.location.origin) return;
        
        // Check if this is the auth callback message
        if (event.data && event.data.type === 'google_auth_callback' && event.data.code) {
          const authCode = event.data.code;
          console.log('Received auth code from callback:', authCode);
          
          // Exchange the code for tokens
          const { data: tokenData, error: tokenError } = await supabase.functions.invoke('google-calendar-event', {
            body: { 
              action: 'token', 
              code: authCode,
              userId: user?.id
            }
          });
          
          if (tokenError) {
            console.error('Error exchanging auth code for tokens:', tokenError);
            toast.error('Failed to connect to Google Calendar');
            return;
          }
          
          console.log('Received token data:', tokenData);
          
          // Save the tokens
          const newTokens = {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_in: tokenData.expires_in,
            expires_at: Date.now() + (tokenData.expires_in * 1000)
          };
          
          console.log('Saving new tokens:', newTokens);
          setTokens(newTokens);
          setIsEnabled(true);
          
          // Save to localStorage
          localStorage.setItem('googleCalendarTokens', JSON.stringify(newTokens));
          localStorage.setItem('googleCalendarEnabled', 'true');
          
          // Show success message
          toast.success('Successfully connected to Google Calendar');
          
          // Remove event listener
          window.removeEventListener('message', handleAuthCallback);
          
          // Clear check interval if it exists
          if (authCheckIntervalRef.current) {
            window.clearInterval(authCheckIntervalRef.current);
            authCheckIntervalRef.current = null;
          }
        } else if (event.data && event.data.type === 'google_auth_error') {
          console.error('Auth error from popup:', event.data.error, event.data.errorDescription);
          toast.error(`Google Calendar connection failed: ${event.data.errorDescription || event.data.error || 'Unknown error'}`);
          
          // Remove event listener
          window.removeEventListener('message', handleAuthCallback);
          
          // Clear check interval if it exists
          if (authCheckIntervalRef.current) {
            window.clearInterval(authCheckIntervalRef.current);
            authCheckIntervalRef.current = null;
          }
        }
      };
      
      // Add event listener for the callback
      window.addEventListener('message', handleAuthCallback);
      
      // Set up polling to check if the window is closed without completing
      authCheckIntervalRef.current = window.setInterval(() => {
        if (authWindowRef.current && authWindowRef.current.closed) {
          console.log('Auth window was closed manually');
          
          // Clean up
          window.removeEventListener('message', handleAuthCallback);
          window.clearInterval(authCheckIntervalRef.current!);
          authCheckIntervalRef.current = null;
          
          // Notify user if needed
          // We don't need to show an error here as the user may have just closed the window
        }
      }, 1000) as unknown as number;
      
    } catch (error) {
      console.error('Error authorizing Google Calendar:', error);
      toast.error('Failed to connect to Google Calendar');
    }
  };

  const disconnectGoogleCalendar = () => {
    // Clear tokens
    setTokens(null);
    setIsEnabled(false);
    
    // Remove from localStorage
    localStorage.removeItem('googleCalendarTokens');
    localStorage.setItem('googleCalendarEnabled', 'false');
    
    // If user is logged in, we could also delete from database
    if (user) {
      // Delete tokens from database
      supabase.functions.invoke('google-calendar-event', {
        body: { 
          action: 'revoke',
          userId: user.id
        }
      }).then(({ error }) => {
        if (error) {
          console.error('Error revoking tokens in database:', error);
        } else {
          console.log('Successfully revoked tokens in database');
        }
      });
    }
    
    toast.info('Disconnected from Google Calendar');
  };

  const getAccessToken = async (): Promise<string | null> => {
    console.log('Getting access token, current tokens:', tokens);
    
    // First check if we have valid tokens
    if (tokens) {
      if (tokens.expires_at > Date.now()) {
        console.log('Using existing valid access token');
        return tokens.access_token;
      }
      
      console.log('Token expired, attempting to refresh');
      
      // Tokens expired, try to refresh
      if (tokens.refresh_token) {
        try {
          const { data, error } = await supabase.functions.invoke('google-calendar-event', {
            body: { 
              action: 'refresh',
              refresh_token: tokens.refresh_token,
              userId: user?.id
            }
          });
          
          if (error) throw error;
          
          console.log('Refresh token response:', data);
          
          if (data.access_token) {
            const newTokens = {
              ...tokens,
              access_token: data.access_token,
              expires_in: data.expires_in,
              expires_at: Date.now() + (data.expires_in * 1000)
            };
            
            console.log('Setting refreshed tokens:', newTokens);
            setTokens(newTokens);
            
            // Update localStorage
            localStorage.setItem('googleCalendarTokens', JSON.stringify(newTokens));
            
            return data.access_token;
          }
        } catch (error) {
          console.error('Error refreshing access token:', error);
          disconnectGoogleCalendar();
          return null;
        }
      }
    }
    
    // If we don't have tokens locally but user is logged in, try to fetch from database
    if (user && !tokens) {
      console.log('No local tokens, trying to fetch from database');
      try {
        const { data, error } = await supabase.functions.invoke('google-calendar-event', {
          body: { 
            action: 'get_tokens',
            userId: user.id
          }
        });
        
        if (error) throw error;
        
        console.log('Database tokens response:', data);
        
        if (data.found && data.access_token) {
          const newTokens = {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
            expires_at: Date.now() + (data.expires_in * 1000)
          };
          
          console.log('Setting tokens from database:', newTokens);
          setTokens(newTokens);
          setIsEnabled(true);
          
          // Update localStorage
          localStorage.setItem('googleCalendarTokens', JSON.stringify(newTokens));
          localStorage.setItem('googleCalendarEnabled', 'true');
          
          return data.access_token;
        } else {
          // If no tokens were found, we need to authorize
          console.log('No tokens found in the database, need to authorize');
          toast.info('Please connect your Google Calendar to continue');
          setIsEnabled(false);
          return null;
        }
      } catch (error) {
        console.error('Error fetching tokens from database:', error);
        toast.error('Error connecting to Google Calendar. Please try again.');
      }
    }
    
    console.log('No valid tokens found');
    return null;
  };

  const value = {
    isEnabled,
    authorizeGoogleCalendar,
    disconnectGoogleCalendar,
    getAccessToken
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
