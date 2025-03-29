
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface GoogleCalendarContextType {
  isEnabled: boolean;
  isLoading: boolean;
  authorizeGoogleCalendar: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const GoogleCalendarContext = createContext<GoogleCalendarContextType>({
  isEnabled: false,
  isLoading: true,
  authorizeGoogleCalendar: async () => {},
  getAccessToken: async () => null
});

export const useGoogleCalendar = () => useContext(GoogleCalendarContext);

export const GoogleCalendarProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkCounter, setCheckCounter] = useState(0);

  // Only check status once when user changes or on initial load
  useEffect(() => {
    if (user && checkCounter === 0) {
      checkGoogleCalendarStatus();
      setCheckCounter(prev => prev + 1);
    } else if (!user) {
      setIsEnabled(false);
      setCheckCounter(0);
    }
  }, [user]);

  const checkGoogleCalendarStatus = async () => {
    try {
      setIsLoading(true);
      
      // Use an edge function to check the status instead of directly accessing the database
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { action: 'check-status' }
      });
      
      if (error) {
        console.error('Error checking Google Calendar status:', error);
        setIsEnabled(false);
        return;
      }
      
      setIsEnabled(data?.isEnabled || false);
    } catch (error) {
      console.error('Error checking Google Calendar authorization:', error);
      setIsEnabled(false);
    } finally {
      setIsLoading(false);
    }
  };

  const authorizeGoogleCalendar = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Get authorization URL from edge function
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { action: 'get-auth-url' }
      });
      
      if (error) {
        console.error('Error getting Google Calendar auth URL:', error);
        return;
      }
      
      if (data?.authUrl) {
        // Store current location to redirect back after authorization
        localStorage.setItem('googleCalendarRedirectPath', window.location.pathname);
        
        // Redirect to Google authorization page
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Error authorizing Google Calendar:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAccessToken = async (): Promise<string | null> => {
    if (!user || !isEnabled) return null;
    
    try {
      // Get access token from edge function
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { action: 'get-token' }
      });
      
      if (error || !data?.access_token) {
        console.error('Error getting Google Calendar token:', error || 'No token returned');
        return null;
      }
      
      return data.access_token;
    } catch (error) {
      console.error('Error getting Google Calendar token:', error);
      return null;
    }
  };

  return (
    <GoogleCalendarContext.Provider value={{ isEnabled, isLoading, authorizeGoogleCalendar, getAccessToken }}>
      {children}
    </GoogleCalendarContext.Provider>
  );
};
