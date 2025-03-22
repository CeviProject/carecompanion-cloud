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

  useEffect(() => {
    setIsMounted(true);
    console.log('GoogleCalendarProvider mounted');
    
    const localEnabled = localStorage.getItem('googleCalendarEnabled');
    if (localEnabled === 'true') {
      setIsEnabled(true);
    }
    
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
    
    if (user) {
      fetchTokensFromDatabase();
    }
    
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        console.log('Ignoring message from unexpected origin:', event.origin);
        return;
      }
      
      console.log('Received message in parent window:', event.data);
      
      if (event.data && event.data.type === 'google_auth_callback' && event.data.code) {
        console.log('Received auth code from popup:', event.data.code);
        handleAuthCode(event.data.code);
      } 
      else if (event.data && event.data.type === 'google_auth_error') {
        console.error('Auth error from popup:', event.data.error, event.data.errorDescription);
        toast.error(`Google Calendar connection failed: ${event.data.errorDescription || event.data.error || 'Unknown error'}`);
      }
    };
    
    window.addEventListener('message', handleAuthMessage);
    
    const checkLocalStorageAuth = () => {
      const storedCode = localStorage.getItem('google_auth_code');
      const timestamp = localStorage.getItem('google_auth_timestamp');
      
      if (storedCode && timestamp) {
        const age = Date.now() - parseInt(timestamp);
        
        if (age < 5 * 60 * 1000) {
          console.log('Found valid auth code in localStorage');
          handleAuthCode(storedCode);
          
          localStorage.removeItem('google_auth_code');
          localStorage.removeItem('google_auth_timestamp');
        } else {
          localStorage.removeItem('google_auth_code');
          localStorage.removeItem('google_auth_timestamp');
        }
      }
    };
    
    checkLocalStorageAuth();
    
    return () => {
      setIsMounted(false);
      console.log('GoogleCalendarProvider unmounting');
      
      window.removeEventListener('message', handleAuthMessage);
    };
  }, [user]);

  const handleAuthCode = async (authCode: string) => {
    if (!isMounted || !user) {
      console.error('Component not mounted or user not logged in, cannot handle auth code');
      return;
    }
    
    console.log('Processing auth code');
    try {
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
      
      const newTokens = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        expires_at: Date.now() + (tokenData.expires_in * 1000)
      };
      
      console.log('Saving new tokens:', newTokens);
      setTokens(newTokens);
      setIsEnabled(true);
      
      localStorage.setItem('googleCalendarTokens', JSON.stringify(newTokens));
      localStorage.setItem('googleCalendarEnabled', 'true');
      
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
        
        localStorage.setItem('googleCalendarTokens', JSON.stringify(newTokens));
        localStorage.setItem('googleCalendarEnabled', 'true');
      } else if (data && !data.found) {
        console.log('No Google Calendar tokens found for this user');
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
      const { data, error } = await supabase.functions.invoke('google-calendar-event', {
        body: { action: 'authorize' }
      });
      
      if (error) {
        console.error('Error getting authorization URL:', error);
        toast.error('Failed to connect to Google Calendar');
        return;
      }
      
      console.log('Received authorization URL:', data?.authUrl);
      
      const authWindow = window.open(
        data.authUrl, 
        '_blank', 
        'width=600,height=700,noopener'
      );
      
      if (!authWindow) {
        toast.error('Popup blocked. Please allow popups for this site.');
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
    
    setTokens(null);
    setIsEnabled(false);
    
    localStorage.removeItem('googleCalendarTokens');
    localStorage.setItem('googleCalendarEnabled', 'false');
    
    if (user) {
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
    
    if (tokens) {
      if (tokens.expires_at > Date.now()) {
        console.log('Using existing valid access token');
        return tokens.access_token;
      }
      
      console.log('Token expired, attempting to refresh');
      
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
          
          localStorage.setItem('googleCalendarTokens', JSON.stringify(newTokens));
          localStorage.setItem('googleCalendarEnabled', 'true');
          
          return data.access_token;
        } else {
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
