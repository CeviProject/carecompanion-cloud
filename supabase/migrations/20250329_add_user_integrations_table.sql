
-- Create the user_integrations table if it doesn't exist
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

-- Add proper RLS policies
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

-- Users can view their own integrations
CREATE POLICY "Users can view their own integrations" 
  ON public.user_integrations
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own integrations
CREATE POLICY "Users can insert their own integrations" 
  ON public.user_integrations
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own integrations
CREATE POLICY "Users can update their own integrations" 
  ON public.user_integrations
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can delete their own integrations
CREATE POLICY "Users can delete their own integrations" 
  ON public.user_integrations
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Service role can access all integrations
CREATE POLICY "Service role can access all user integrations" 
  ON public.user_integrations
  USING (auth.role() = 'service_role');
