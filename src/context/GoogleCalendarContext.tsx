
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
  const [isMounted, setIsMounted] = useState(false);
  
  // Instead of using a ref for the window and interval, use state to track them
  const [authStateData, setAuthStateData] = useState<{
    window: Window | null;
    messageHandler: ((event: MessageEvent) => void) | null;
  }>({
    window: null,
    messageHandler: null
  });

  useEffect(() => {
    setIsMounted(true);
    console.log('GoogleCalendarProvider mounted');
    
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
    
    // Setup event listener for message from the popup
    const handleMessage = (event: MessageEvent) => {
      console.log('Received message event in parent window:', event);
      // Only process messages from our expected origin
      if (event.origin !== window.location.origin) {
        console.log('Ignoring message from unexpected origin:', event.origin);
        return;
      }
      
      // Handle auth callback
      if (event.data && event.data.type === 'google_auth_callback' && event.data.code) {
        console.log('Received auth callback with code:', event.data.code);
        handleAuthCode(event.data.code);
      } 
      // Handle auth error
      else if (event.data && event.data.type === 'google_auth_error') {
        console.error('Auth error from popup:', event.data.error, event.data.errorDescription);
        toast.error(`Google Calendar connection failed: ${event.data.errorDescription || event.data.error || 'Unknown error'}`);
      }
    };
    
    // Add the global message listener
    window.addEventListener('message', handleMessage);

    return () => {
      setIsMounted(false);
      console.log('GoogleCalendarProvider unmounting');
      
      // Clean up the message listener
      window.removeEventListener('message', handleMessage);
      
      // Close any open auth window
      if (authStateData.window && !authStateData.window.closed) {
        try {
          authStateData.window.close();
        } catch (err) {
          console.error('Error closing auth window:', err);
        }
      }
    };
  }, [user]);

  // Handle auth code from the popup
  const handleAuthCode = async (authCode: string) => {
    if (!isMounted || !user) {
      console.error('Component not mounted or user not logged in, cannot handle auth code');
      return;
    }
    
    console.log('Processing auth code');
    try {
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
    } catch (error) {
      console.error('Error handling auth code:', error);
      toast.error('Failed to complete Google Calendar authorization');
    }
  };

  const fetchTokensFromDatabase = async () => {
    if (!user || !isMounted) return;
    
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
    if (!isMounted) {
      console.error('Component not mounted, cannot authorize');
      return;
    }
    
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
      if (authStateData.window && !authStateData.window.closed) {
        try {
          authStateData.window.close();
        } catch (err) {
          console.error('Error closing existing auth window:', err);
        }
      }
      
      // Open the authorization URL in a new window
      // Use window.open with specific features to avoid COOP issues
      const authWindow = window.open(
        data.authUrl, 
        '_blank', 
        'width=500,height=600,noopener'
      );
      
      // Update the state with the new window
      setAuthStateData({
        window: authWindow,
        messageHandler: null
      });
      
      if (!authWindow) {
        toast.error('Popup blocked. Please allow popups for this site.');
        return;
      }
      
    } catch (error) {
      console.error('Error authorizing Google Calendar:', error);
      toast.error('Failed to connect to Google Calendar');
    }
  };

  const disconnectGoogleCalendar = () => {
    if (!isMounted) {
      console.error('Component not mounted, cannot disconnect');
      return;
    }
    
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
    if (!isMounted) {
      console.error('Component not mounted, cannot get access token');
      return null;
    }
    
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
