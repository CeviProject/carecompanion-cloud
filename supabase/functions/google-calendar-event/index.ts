import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
// This should match exactly what you configured in Google Cloud Console
const REDIRECT_URI = Deno.env.get('REDIRECT_URI') || 'http://localhost:8080/auth/google/callback';

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
      console.error(`GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID ? 'Set' : 'Not set'}`);
      console.error(`GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET ? 'Set' : 'Not set'}`);
      throw new Error('Google Calendar API credentials are not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the environment variables.');
    }

    // Parse the request body to get the action
    let data;
    let action;
    
    try {
      const requestData = await req.json();
      console.log('Request data:', JSON.stringify(requestData, null, 2));
      action = requestData.action;
      data = requestData;
    } catch (e) {
      console.error('Error parsing request data:', e);
      throw new Error('Invalid request data');
    }
    
    console.log(`Processing action: ${action}`);

    // Generate OAuth URL for user authorization
    if (action === 'authorize') {
      const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ];
      
      console.log(`Using redirect URI: ${REDIRECT_URI}`);
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('scope', scopes.join(' '));
      authUrl.searchParams.append('access_type', 'offline');
      authUrl.searchParams.append('prompt', 'consent');
      authUrl.searchParams.append('state', 'google_calendar_auth');
      
      console.log('Generated auth URL:', authUrl.toString());
      
      return new Response(JSON.stringify({ 
        authUrl: authUrl.toString() 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Exchange authorization code for tokens
    if (action === 'token') {
      const { code, userId } = data;
      
      if (!code) {
        throw new Error('Authorization code is required');
      }
      
      console.log(`Exchanging authorization code for tokens with redirect URI: ${REDIRECT_URI}`);
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
      
      const responseText = await tokenResponse.text();
      console.log('Token exchange response:', responseText);
      
      if (!tokenResponse.ok) {
        console.error('Token exchange error:', responseText);
        throw new Error(`Failed to exchange authorization code: ${responseText}`);
      }
      
      const tokenData = JSON.parse(responseText);
      console.log('Token exchange successful');
      
      // If userId is provided, store the tokens in the database
      let dbSaveSuccess = false;
      if (userId) {
        try {
          // Create a Supabase client for the edge function
          const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
          const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
          const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
          
          if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Supabase credentials not configured for database storage');
          } else {
            const supabase = createClient(supabaseUrl, supabaseServiceKey);
            
            try {
              // First check if user_integrations table exists
              const { data: tableExists, error: tableCheckError } = await supabase
                .from('user_integrations')
                .select('count(*)', { count: 'exact', head: true });
              
              if (tableCheckError) {
                // Table probably doesn't exist, create it
                console.log('Creating user_integrations table');
                
                const { error: createError } = await supabase.rpc('create_user_integrations_table');
                
                if (createError) {
                  console.error('Error creating table:', createError);
                  
                  // Try direct SQL as fallback
                  const { error: sqlError } = await supabase.rpc('execute_sql', {
                    sql: `
                      CREATE TABLE IF NOT EXISTS public.user_integrations (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                        provider TEXT NOT NULL,
                        access_token TEXT NOT NULL,
                        refresh_token TEXT,
                        expires_at TIMESTAMPTZ,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                        UNIQUE(user_id, provider)
                      );
                      ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;
                      CREATE POLICY "Users can view their own integrations" ON public.user_integrations
                        FOR SELECT USING (auth.uid() = user_id);
                      CREATE POLICY "Users can insert their own integrations" ON public.user_integrations
                        FOR INSERT WITH CHECK (auth.uid() = user_id);
                      CREATE POLICY "Users can update their own integrations" ON public.user_integrations
                        FOR UPDATE USING (auth.uid() = user_id);
                    `
                  });
                  
                  if (sqlError) {
                    console.error('Error executing SQL to create table:', sqlError);
                  }
                }
              }
              
              // Now try to store tokens
              console.log('Storing tokens in database for user:', userId);
              const { data: insertData, error: insertError } = await supabase
                .from('user_integrations')
                .upsert({
                  user_id: userId,
                  provider: 'google_calendar',
                  access_token: tokenData.access_token,
                  refresh_token: tokenData.refresh_token,
                  expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,provider' })
                .select();
              
              if (insertError) {
                console.error('Error storing tokens in database:', insertError);
              } else {
                dbSaveSuccess = true;
                console.log('Tokens successfully stored in database for user:', userId);
              }
            } catch (innerError) {
              console.error('Error in database operations:', innerError);
            }
          }
        } catch (dbError) {
          console.error('Database token storage error:', dbError);
        }
      }
      
      return new Response(JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        stored_in_db: dbSaveSuccess
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Refresh an expired access token
    if (action === 'refresh') {
      const { refresh_token, userId } = data;
      
      if (!refresh_token) {
        throw new Error('Refresh token is required');
      }
      
      console.log('Refreshing access token');
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
      
      const responseText = await tokenResponse.text();
      console.log('Token refresh response:', responseText);
      
      if (!tokenResponse.ok) {
        console.error('Token refresh error:', responseText);
        throw new Error(`Failed to refresh token: ${responseText}`);
      }
      
      const tokenData = JSON.parse(responseText);
      console.log('Token refresh successful');
      
      // If userId is provided, update the tokens in the database
      let dbUpdateSuccess = false;
      if (userId) {
        try {
          // Create a Supabase client for the edge function
          const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
          const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
          const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
          
          if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Supabase credentials not configured for database storage');
          } else {
            const supabase = createClient(supabaseUrl, supabaseServiceKey);
            
            // Update tokens in the database
            const { data: updateData, error: updateError } = await supabase
              .from('user_integrations')
              .update({
                access_token: tokenData.access_token,
                expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
                updated_at: new Date().toISOString()
              })
              .match({ user_id: userId, provider: 'google_calendar' });
            
            if (updateError) {
              console.error('Error updating tokens in database:', updateError);
            } else {
              dbUpdateSuccess = true;
              console.log('Tokens successfully updated in database for user:', userId);
            }
          }
        } catch (dbError) {
          console.error('Database token update error:', dbError);
        }
      }
      
      return new Response(JSON.stringify({
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in,
        updated_in_db: dbUpdateSuccess
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Get tokens for a user
    if (action === 'get_tokens') {
      const { userId } = data;
      
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      try {
        // Create a Supabase client for the edge function
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        
        if (!supabaseUrl || !supabaseServiceKey) {
          throw new Error('Supabase credentials not configured for database access');
        }
        
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // Check if the user_integrations table exists
        try {
          // Get tokens from the database
          const { data: integrationData, error: integrationError } = await supabase
            .from('user_integrations')
            .select('*')
            .match({ user_id: userId, provider: 'google_calendar' })
            .single();
          
          if (integrationError) {
            console.error('Error fetching tokens from database:', integrationError);
            // Return empty tokens if not found
            return new Response(JSON.stringify({
              message: 'No Google Calendar integration found for this user',
              found: false
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          console.log('Tokens fetched from database for user:', userId);
          
          // Check if tokens are expired
          const expiresAt = new Date(integrationData.expires_at).getTime();
          const now = Date.now();
          
          if (now >= expiresAt) {
            console.log('Access token expired, refreshing...');
            
            // Refresh token
            const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                refresh_token: integrationData.refresh_token,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                grant_type: 'refresh_token',
              }),
            });
            
            const refreshResponseText = await refreshResponse.text();
            console.log('Token refresh response:', refreshResponseText);
            
            if (!refreshResponse.ok) {
              console.error('Token refresh error:', refreshResponseText);
              throw new Error(`Failed to refresh token: ${refreshResponseText}`);
            }
            
            const refreshData = JSON.parse(refreshResponseText);
            console.log('Token refresh successful');
            
            // Update tokens in the database
            const { error: updateError } = await supabase
              .from('user_integrations')
              .update({
                access_token: refreshData.access_token,
                expires_at: new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString(),
                updated_at: new Date().toISOString()
              })
              .match({ user_id: userId, provider: 'google_calendar' });
            
            if (updateError) {
              console.error('Error updating tokens in database:', updateError);
            }
            
            return new Response(JSON.stringify({
              access_token: refreshData.access_token,
              refresh_token: integrationData.refresh_token,
              expires_in: refreshData.expires_in,
              found: true
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          return new Response(JSON.stringify({
            access_token: integrationData.access_token,
            refresh_token: integrationData.refresh_token,
            expires_in: Math.floor((expiresAt - now) / 1000),
            found: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (tableError) {
          console.error('Error with user_integrations table:', tableError);
          return new Response(JSON.stringify({
            message: 'User integrations table not available',
            found: false
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (error) {
        console.error('Error getting tokens from database:', error);
        throw new Error(`Failed to get tokens: ${error.message}`);
      }
    }
    
    // Revoke access and remove tokens
    if (action === 'revoke') {
      const { userId } = data;
      
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      try {
        // Create a Supabase client for the edge function
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        
        if (!supabaseUrl || !supabaseServiceKey) {
          throw new Error('Supabase credentials not configured for database access');
        }
        
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // Get the current tokens to revoke them with Google
        const { data: currentTokens, error: getError } = await supabase
          .from('user_integrations')
          .select('access_token, refresh_token')
          .match({ user_id: userId, provider: 'google_calendar' })
          .single();
        
        if (!getError && currentTokens?.access_token) {
          // Revoke the token with Google
          try {
            await fetch(`https://oauth2.googleapis.com/revoke?token=${currentTokens.access_token}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              }
            });
            console.log('Token revoked with Google');
          } catch (revokeError) {
            console.error('Error revoking token with Google:', revokeError);
            // Continue anyway to remove from database
          }
        }
        
        // Delete tokens from database
        const { error: deleteError } = await supabase
          .from('user_integrations')
          .delete()
          .match({ user_id: userId, provider: 'google_calendar' });
        
        if (deleteError) {
          console.error('Error deleting tokens from database:', deleteError);
          throw new Error(`Failed to delete tokens: ${deleteError.message}`);
        }
        
        console.log('Tokens successfully deleted from database for user:', userId);
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Google Calendar integration removed successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Error revoking tokens:', error);
        throw new Error(`Failed to revoke tokens: ${error.message}`);
      }
    }
    
    // Create a calendar event
    if (action === 'create') {
      const { event, accessToken } = data;
      
      if (!event || !event.summary || !event.startTime || !event.endTime) {
        console.error('Invalid event data:', JSON.stringify(event, null, 2));
        throw new Error('Invalid event data. Required fields: summary, startTime, endTime');
      }

      if (!accessToken) {
        throw new Error('No access token provided. User must authorize Google Calendar access');
      }
      
      console.log('Creating calendar event:', JSON.stringify(event, null, 2));
      
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
      console.log('Sending request to Google Calendar API');
      console.log('Request details:', JSON.stringify({
        url: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: calendarEvent
      }, null, 2));
      
      try {
        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(calendarEvent),
        });
        
        const responseText = await response.text();
        console.log('Google Calendar API response:', responseText);
        
        if (!response.ok) {
          console.error('Google Calendar API error:', responseText);
          throw new Error(`Google Calendar API error (${response.status}): ${responseText}`);
        }
        
        const responseData = JSON.parse(responseText);
        console.log('Event created successfully:', responseData.id);
        
        return new Response(JSON.stringify({ 
          success: true,
          eventId: responseData.id,
          htmlLink: responseData.htmlLink
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Error creating calendar event:', error);
        throw new Error(`Error creating calendar event: ${error.message}`);
      }
    }
    
    // Sync all medications to Google Calendar
    if (action === 'sync_all_medications') {
      const { userId, accessToken, medications } = data;
      
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      if (!accessToken) {
        throw new Error('No access token provided. User must authorize Google Calendar access');
      }
      
      if (!medications || !Array.isArray(medications) || medications.length === 0) {
        throw new Error('No medications provided to sync');
      }
      
      console.log(`Syncing ${medications.length} medications to Google Calendar for user: ${userId}`);
      
      const results = {
        successful: 0,
        failed: 0,
        details: []
      };
      
      for (const med of medications) {
        try {
          // Handle recurring events
          let recurrence = null;
          if (med.frequency) {
            recurrence = createRecurrenceRule(med.frequency, med.end_date);
          }
          
          const calendarEvent = {
            summary: `Take ${med.name} ${med.dosage}`,
            description: med.notes || `Remember to take your ${med.name}. Dosage: ${med.dosage}`,
            start: {
              dateTime: new Date(new Date(med.start_date).setHours(
                parseInt(med.time.split(':')[0]), 
                parseInt(med.time.split(':')[1]), 
                0, 0
              )).toISOString(),
              timeZone: 'UTC',
            },
            end: {
              dateTime: new Date(new Date(med.start_date).setHours(
                parseInt(med.time.split(':')[0]), 
                parseInt(med.time.split(':')[1]) + 15, 
                0, 0
              )).toISOString(),
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
          
          const responseText = await response.text();
          
          if (!response.ok) {
            console.error(`Error syncing medication ${med.id}: ${responseText}`);
            results.failed++;
            results.details.push({
              id: med.id,
              name: med.name,
              success: false,
              error: responseText
            });
          } else {
            const responseData = JSON.parse(responseText);
            console.log(`Successfully synced medication ${med.id} to event ${responseData.id}`);
            results.successful++;
            results.details.push({
              id: med.id,
              name: med.name,
              success: true,
              eventId: responseData.id,
              htmlLink: responseData.htmlLink
            });
          }
        } catch (error: any) {
          console.error(`Error processing medication ${med.id}:`, error);
          results.failed++;
          results.details.push({
            id: med.id,
            name: med.name,
            success: false,
            error: error.message
          });
        }
      }
      
      return new Response(JSON.stringify({
        success: results.failed === 0,
        results
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // If no valid action is matched
    console.error('Invalid action specified:', action);
    throw new Error('Invalid action specified. Valid actions are: authorize, token, refresh, get_tokens, revoke, create, sync_all_medications');
    
  } catch (error) {
    console.error('Error in google-calendar-event function:', error.message);
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
    const formattedDate = endDate.toString().split('T')[0].replace(/-/g, '');
    rule += `;UNTIL=${formattedDate}T235959Z`;
  }
  
  return rule;
}
