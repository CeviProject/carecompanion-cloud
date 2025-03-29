
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { GoogleCalendarContextType } from '@/types/GoogleCalendarTypes';

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkGoogleCalendarStatus();
    } else {
      setIsEnabled(false);
      setIsLoading(false);
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
