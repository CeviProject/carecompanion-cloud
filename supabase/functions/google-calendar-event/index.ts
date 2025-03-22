
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const REDIRECT_URI = Deno.env.get('REDIRECT_URI') || 'http://localhost:3000/auth/google/callback';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Google Calendar function started');
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('Google credentials not configured');
      throw new Error('Google Calendar API credentials are not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the environment variables.');
    }

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // Generate OAuth URL for user authorization
    if (path === 'authorize') {
      const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ];
      
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('scope', scopes.join(' '));
      authUrl.searchParams.append('access_type', 'offline');
      authUrl.searchParams.append('prompt', 'consent');
      
      return new Response(JSON.stringify({ 
        authUrl: authUrl.toString() 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Exchange authorization code for tokens
    if (path === 'token') {
      const { code } = await req.json();
      
      if (!code) {
        throw new Error('Authorization code is required');
      }
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });
      
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error('Token exchange error:', errorData);
        throw new Error(`Failed to exchange authorization code: ${errorData}`);
      }
      
      const tokenData = await tokenResponse.json();
      
      return new Response(JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Refresh an expired access token
    if (path === 'refresh') {
      const { refresh_token } = await req.json();
      
      if (!refresh_token) {
        throw new Error('Refresh token is required');
      }
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          grant_type: 'refresh_token',
        }),
      });
      
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error('Token refresh error:', errorData);
        throw new Error(`Failed to refresh token: ${errorData}`);
      }
      
      const tokenData = await tokenResponse.json();
      
      return new Response(JSON.stringify({
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Create a calendar event
    if (path === 'create' || !path) {
      const { event, accessToken } = await req.json();
      
      if (!event || !event.summary || !event.startTime || !event.endTime) {
        throw new Error('Invalid event data. Required fields: summary, startTime, endTime');
      }

      if (!accessToken) {
        throw new Error('No access token provided. User must authorize Google Calendar access');
      }
      
      console.log('Creating calendar event:', event);
      
      // Handle recurring events
      let recurrence = null;
      if (event.frequency) {
        recurrence = createRecurrenceRule(event.frequency, event.endDate);
      }
      
      const calendarEvent = {
        summary: event.summary,
        description: event.description || '',
        start: {
          dateTime: event.startTime,
          timeZone: 'UTC',
        },
        end: {
          dateTime: event.endTime,
          timeZone: 'UTC',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 30 } // 30 minutes before
          ],
        },
        // Add recurrence rule if this is a recurring event
        ...(recurrence && { recurrence: [recurrence] })
      };
      
      // Create the event in Google Calendar
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calendarEvent),
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error('Google Calendar API error:', error);
        throw new Error(`Google Calendar API error: ${error}`);
      }
      
      const data = await response.json();
      
      return new Response(JSON.stringify({ 
        success: true,
        eventId: data.id,
        htmlLink: data.htmlLink
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // If no valid path is matched
    throw new Error('Invalid request path');
    
  } catch (error) {
    console.error('Error in google-calendar-event function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to create a recurrence rule for Google Calendar
function createRecurrenceRule(frequency: string, endDate: string | null): string {
  let rule = 'RRULE:FREQ=';
  
  switch (frequency) {
    case 'daily':
      rule += 'DAILY';
      break;
    case 'twice_daily':
      // For twice daily, we'll need to create two separate events instead
      // But for the purpose of this example, we'll just use DAILY
      rule += 'DAILY';
      break;
    case 'three_times_daily':
      // Similar to twice daily
      rule += 'DAILY';
      break;
    case 'weekly':
      rule += 'WEEKLY';
      break;
    case 'monthly':
      rule += 'MONTHLY';
      break;
    case 'as_needed':
      // For as needed, no recurrence
      return '';
    default:
      rule += 'DAILY';
  }
  
  // Add end date if provided
  if (endDate) {
    const formattedDate = endDate.split('T')[0].replace(/-/g, '');
    rule += `;UNTIL=${formattedDate}T235959Z`;
  }
  
  return rule;
}
